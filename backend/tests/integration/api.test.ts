import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  applyEventsSchema,
  assignRole,
  buildApi,
  clubEvent,
  loginAdmin,
  resetEvents,
  seedCampus,
  signUp,
  STUDENT_PASSWORD,
  type Auth,
} from './apiKit';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

/** The whole API on a real database: HTTP in, Postgres out. */
describe.skipIf(!hasTestDb)('API on PostgreSQL', () => {
  let pool: Pool;
  let app: ReturnType<typeof buildApi>['app'];
  let campus: Awaited<ReturnType<typeof seedCampus>>;
  let admin: Auth;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    await applyEventsSchema(pool);
    app = buildApi(pool).app;
  });
  beforeEach(async () => {
    await resetEvents(pool);
    await resetData(pool);
    campus = await seedCampus(pool);
    admin = await loginAdmin(app);
  });
  afterAll(() => pool.end());

  describe('sign-up and login', () => {
    it('signs up a student with no permissions and rejects a duplicate enrollment number', async () => {
      const first = await request(app).post('/api/auth/signup').send({
        name: 'Asha',
        enrollmentNo: 'iit2025001',
        sectionId: campus.section.sectionId,
        password: STUDENT_PASSWORD,
      });
      expect(first.status).toBe(201);
      expect(first.body.user.enrollmentNo).toBe('IIT2025001');
      expect(JSON.stringify(first.body)).not.toMatch(/hash/i);

      const again = await request(app).post('/api/auth/signup').send({
        name: 'Other',
        enrollmentNo: 'IIT2025001',
        sectionId: campus.section.sectionId,
        password: STUDENT_PASSWORD,
      });
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('ENROLLMENT_EXISTS');
    });

    it('rejects missing fields (400) and an unknown section (404)', async () => {
      const missing = await request(app).post('/api/auth/signup').send({ name: 'A' });
      expect(missing.status).toBe(400);
      const unknown = await request(app).post('/api/auth/signup').send({
        name: 'A',
        enrollmentNo: 'IIT2025002',
        sectionId: '99999999-9999-4999-8999-999999999999',
        password: STUDENT_PASSWORD,
      });
      expect(unknown.status).toBe(404);
    });

    it('gives the same 401 for a wrong password and an unknown enrollment number', async () => {
      await signUp(app, campus.section.sectionId, 'IIT2025003');
      const wrong = await request(app)
        .post('/api/auth/login')
        .send({ enrollmentNo: 'IIT2025003', password: 'not the password' });
      const unknown = await request(app)
        .post('/api/auth/login')
        .send({ enrollmentNo: 'IIT2099999', password: 'not the password' });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
    });
  });

  describe('protected routes', () => {
    it('answers 401 without a token, 403 for a student, and 200 for an admin', async () => {
      const { auth } = await signUp(app, campus.section.sectionId, 'IIT2025004');
      expect((await request(app).get('/api/students')).status).toBe(401);
      expect((await request(app).get('/api/students').set(auth)).status).toBe(403);
      expect((await request(app).get('/api/students').set(admin)).status).toBe(200);
    });
  });

  describe('role assignment', () => {
    it('rejects a duplicate active assignment (409), a scope mismatch (422) and a non-admin (403)', async () => {
      const { auth, userId } = await signUp(app, campus.section.sectionId, 'IIT2025005');
      const body = {
        studentId: userId,
        positionId: campus.secretary.positionId,
        clubId: campus.clubX.clubId,
      };
      expect((await assignRole(app, admin, body)).status).toBe(201);

      const dup = await assignRole(app, admin, body);
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('DUPLICATE_ASSIGNMENT');

      const mismatch = await assignRole(app, admin, {
        studentId: userId,
        positionId: campus.secretary.positionId,
      });
      expect(mismatch.status).toBe(422);
      expect(mismatch.body.error.code).toBe('SCOPE_MISMATCH');

      expect((await assignRole(app, auth, body)).status).toBe(403);
    });

    it('allows a second assignment only after the first was revoked', async () => {
      const { userId } = await signUp(app, campus.section.sectionId, 'IIT2025006');
      const body = {
        studentId: userId,
        positionId: campus.member.positionId,
        clubId: campus.clubX.clubId,
      };
      const first = await assignRole(app, admin, body);
      await request(app).post(`/api/role-assignments/${first.body.assignmentId}/revoke`).set(admin);
      const second = await assignRole(app, admin, body);
      expect(second.status).toBe(201);
      const history = await request(app).get(`/api/students/${userId}/role-assignments`).set(admin);
      expect(history.body).toHaveLength(2);
    });
  });

  describe('acceptance scenarios', () => {
    it('4: a student who is only a club member cannot create a club event', async () => {
      const { auth, userId } = await signUp(app, campus.section.sectionId, 'IIT2025007');
      await assignRole(app, admin, {
        studentId: userId,
        positionId: campus.member.positionId,
        clubId: campus.clubX.clubId,
      });
      const res = await request(app)
        .post('/api/events')
        .set(auth)
        .send(clubEvent(campus.clubX.clubId));
      expect(res.status).toBe(403);
    });

    it('5: secretary of Club X and member of Club Y can publish for X but not for Y', async () => {
      const { auth, userId } = await signUp(app, campus.section.sectionId, 'IIT2025008');
      await assignRole(app, admin, {
        studentId: userId,
        positionId: campus.secretary.positionId,
        clubId: campus.clubX.clubId,
      });
      await assignRole(app, admin, {
        studentId: userId,
        positionId: campus.member.positionId,
        clubId: campus.clubY.clubId,
      });
      const forX = await request(app)
        .post('/api/events')
        .set(auth)
        .send(clubEvent(campus.clubX.clubId));
      const forY = await request(app)
        .post('/api/events')
        .set(auth)
        .send(clubEvent(campus.clubY.clubId));
      expect(forX.status).toBe(201);
      expect(forY.status).toBe(403);
    });

    it('6: after a revoke the student cannot publish at once, and old events stay', async () => {
      const { auth, userId } = await signUp(app, campus.section.sectionId, 'IIT2025009');
      const assigned = await assignRole(app, admin, {
        studentId: userId,
        positionId: campus.secretary.positionId,
        clubId: campus.clubX.clubId,
      });
      const created = await request(app)
        .post('/api/events')
        .set(auth)
        .send(clubEvent(campus.clubX.clubId, 'Before revoke'));
      expect(created.status).toBe(201);

      const revoked = await request(app)
        .post(`/api/role-assignments/${assigned.body.assignmentId}/revoke`)
        .set(admin);
      expect(revoked.status).toBe(200);

      // Same token, very next request.
      const after = await request(app)
        .post('/api/events')
        .set(auth)
        .send(clubEvent(campus.clubX.clubId, 'After revoke'));
      expect(after.status).toBe(403);

      const calendar = await request(app)
        .get('/api/calendar?from=2030-01-01T00:00:00Z&to=2030-02-01T00:00:00Z')
        .set(auth);
      expect(calendar.status).toBe(200);
      const titles = calendar.body.events.map((e: { title: string }) => e.title);
      expect(titles).toContain('Before revoke');
      expect(titles).not.toContain('After revoke');
    });

    it('extra: a removed student cannot log in and their old token stops working', async () => {
      const { auth, userId } = await signUp(app, campus.section.sectionId, 'IIT2025010');
      expect((await request(app).get('/api/me').set(auth)).status).toBe(200);

      const removed = await request(app).delete(`/api/students/${userId}`).set(admin);
      expect(removed.status).toBe(204);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ enrollmentNo: 'IIT2025010', password: STUDENT_PASSWORD });
      expect(login.status).toBe(401);
      expect((await request(app).get('/api/me').set(auth)).status).toBe(401);

      // The number stays reserved after a soft delete.
      const reuse = await request(app).post('/api/auth/signup').send({
        name: 'New',
        enrollmentNo: 'IIT2025010',
        sectionId: campus.section.sectionId,
        password: STUDENT_PASSWORD,
      });
      expect(reuse.status).toBe(409);
    });
  });
});

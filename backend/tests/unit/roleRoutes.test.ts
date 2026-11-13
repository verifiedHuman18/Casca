import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { signUpInput } from './authTestKit';
import {
  ADMIN_PASSWORD,
  CAMPUS_POSITION_ID,
  CLUB_ID,
  CR_POSITION_ID,
  makeRegistryKit,
  POSITION_ID,
  SECTION_2_ID,
} from './registryKit';

type Auth = { Authorization: string };
let app: ReturnType<typeof createApp>;
let adminAuth: Auth;
let studentAuth: Auth;
let otherAuth: Auth;
let studentId: string;
let otherId: string;

const assign = (body: object, auth: Auth = adminAuth) =>
  request(app).post('/api/role-assignments').set(auth).send(body);
const me = (auth: Auth) => request(app).get('/api/me').set(auth);

beforeEach(async () => {
  const kit = makeRegistryKit();
  app = createApp({ authService: kit.authService, registry: kit.registry, roles: kit.roles });
  const a = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@campus.edu', password: ADMIN_PASSWORD });
  adminAuth = { Authorization: `Bearer ${a.body.token}` };
  const s = await request(app).post('/api/auth/signup').send(signUpInput);
  studentAuth = { Authorization: `Bearer ${s.body.token}` };
  studentId = s.body.user.userId;
  const o = await request(app)
    .post('/api/auth/signup')
    .send({ ...signUpInput, enrollmentNo: 'IIT2025258' });
  otherAuth = { Authorization: `Bearer ${o.body.token}` };
  otherId = o.body.user.userId;
});

describe('GET /api/me', () => {
  it('needs a token', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
  });

  it('gives a new student no permissions, and an admin the admin set', async () => {
    const student = await me(studentAuth);
    expect(student.status).toBe(200);
    expect(student.body.user.enrollmentNo).toBe('IIT2025257');
    expect(student.body.permissions).toEqual([]);
    expect(JSON.stringify(student.body)).not.toMatch(/hash/i);

    const admin = await me(adminAuth);
    expect(admin.body.permissions).toContain('MANAGE_ROLES');
    expect(admin.body.permissions).toContain('MANAGE_REGISTRY');
  });
});

describe('POST /api/role-assignments', () => {
  it('assigns (201) and the rights apply on the very next request with the same token', async () => {
    const res = await assign({ studentId, positionId: POSITION_ID, clubId: CLUB_ID });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      studentId,
      positionName: 'Club Secretary',
      clubName: 'Coding Club',
      active: true,
      endsOn: null,
    });
    const after = await me(studentAuth);
    expect(after.body.permissions).toContain('CREATE_CLUB_EVENT');
    expect(after.body.user.clubIds).toEqual([CLUB_ID]);
  });

  it('is forbidden (403) for a student, even one with another position', async () => {
    expect((await assign({ studentId, positionId: POSITION_ID }, studentAuth)).status).toBe(403);
    await assign({ studentId, positionId: POSITION_ID, clubId: CLUB_ID });
    const res = await assign(
      { studentId: otherId, positionId: POSITION_ID, clubId: CLUB_ID },
      studentAuth
    );
    expect(res.status).toBe(403);
  });

  it('answers 404 for an unknown student, position, club or section', async () => {
    const unknown = '99999999-9999-4999-8999-999999999999';
    const cases = [
      { studentId: unknown, positionId: POSITION_ID, clubId: CLUB_ID },
      { studentId, positionId: unknown, clubId: CLUB_ID },
      { studentId, positionId: POSITION_ID, clubId: unknown },
      { studentId, positionId: CR_POSITION_ID, sectionId: unknown },
    ];
    for (const body of cases) expect((await assign(body)).status).toBe(404);
  });

  it('answers 422 when the target does not match the position scope', async () => {
    const cases = [
      { studentId, positionId: POSITION_ID }, // club position, no club
      { studentId, positionId: POSITION_ID, clubId: CLUB_ID, sectionId: SECTION_2_ID },
      { studentId, positionId: CR_POSITION_ID, clubId: CLUB_ID }, // section position, club given
      { studentId, positionId: CAMPUS_POSITION_ID, clubId: CLUB_ID }, // campus takes neither
    ];
    for (const body of cases) {
      const res = await assign(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('SCOPE_MISMATCH');
    }
  });

  it('assigns a section and a campus position', async () => {
    expect(
      (await assign({ studentId, positionId: CR_POSITION_ID, sectionId: SECTION_2_ID })).status
    ).toBe(201);
    expect((await assign({ studentId, positionId: CAMPUS_POSITION_ID })).status).toBe(201);
  });

  it('answers 409 for an active duplicate, and 400 for bad input', async () => {
    const body = { studentId, positionId: POSITION_ID, clubId: CLUB_ID };
    expect((await assign(body)).status).toBe(201);
    const dup = await assign(body);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_ASSIGNMENT');
    expect((await assign({ studentId: 'x', positionId: POSITION_ID })).status).toBe(400);
    expect((await assign({})).status).toBe(400);
  });
});

describe('POST /api/role-assignments/:id/revoke', () => {
  it('ends it at once, a second revoke is 409, and re-assigning creates a new row', async () => {
    const body = { studentId, positionId: POSITION_ID, clubId: CLUB_ID };
    const created = await assign(body);
    const id = created.body.assignmentId;
    expect((await me(studentAuth)).body.permissions).toContain('CREATE_CLUB_EVENT');

    const revoked = await request(app).post(`/api/role-assignments/${id}/revoke`).set(adminAuth);
    expect(revoked.status).toBe(200);
    expect(revoked.body.active).toBe(false);
    expect((await me(studentAuth)).body.permissions).toEqual([]);

    const again = await request(app).post(`/api/role-assignments/${id}/revoke`).set(adminAuth);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_ENDED');

    const reassigned = await assign(body);
    expect(reassigned.status).toBe(201);
    expect(reassigned.body.assignmentId).not.toBe(id);
  });

  it('is 404 for an unknown id, 400 for a malformed id, 403 for a student', async () => {
    const unknown = '99999999-9999-4999-8999-999999999999';
    expect(
      (await request(app).post(`/api/role-assignments/${unknown}/revoke`).set(adminAuth)).status
    ).toBe(404);
    expect(
      (await request(app).post('/api/role-assignments/nope/revoke').set(adminAuth)).status
    ).toBe(400);
    expect(
      (await request(app).post(`/api/role-assignments/${unknown}/revoke`).set(studentAuth)).status
    ).toBe(403);
  });
});

describe('GET /api/students/:id/role-assignments', () => {
  it('shows active and past to the student themself and to an admin, not to another student', async () => {
    const created = await assign({ studentId, positionId: POSITION_ID, clubId: CLUB_ID });
    await request(app)
      .post(`/api/role-assignments/${created.body.assignmentId}/revoke`)
      .set(adminAuth);
    await assign({ studentId, positionId: CR_POSITION_ID, sectionId: SECTION_2_ID });

    const own = await request(app)
      .get(`/api/students/${studentId}/role-assignments`)
      .set(studentAuth);
    expect(own.status).toBe(200);
    expect(own.body).toHaveLength(2);
    expect(own.body.map((a: { active: boolean }) => a.active).sort()).toEqual([false, true]);

    const byAdmin = await request(app)
      .get(`/api/students/${studentId}/role-assignments`)
      .set(adminAuth);
    expect(byAdmin.body).toHaveLength(2);

    const other = await request(app)
      .get(`/api/students/${studentId}/role-assignments`)
      .set(otherAuth);
    expect(other.status).toBe(403);
  });

  it('is 404 for an admin asking about an unknown student, and paginates', async () => {
    const unknown = '99999999-9999-4999-8999-999999999999';
    expect(
      (await request(app).get(`/api/students/${unknown}/role-assignments`).set(adminAuth)).status
    ).toBe(404);
    await assign({ studentId, positionId: CR_POSITION_ID, sectionId: SECTION_2_ID });
    await assign({ studentId, positionId: CAMPUS_POSITION_ID });
    const page = await request(app)
      .get(`/api/students/${studentId}/role-assignments?limit=1&offset=1`)
      .set(adminAuth);
    expect(page.body).toHaveLength(1);
  });
});

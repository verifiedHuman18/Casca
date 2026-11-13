import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { signUpInput } from './authTestKit';
import { ADMIN_PASSWORD, CLUB_ID, makeRegistryKit, POSITION_ID, STUDENT_ID } from './registryKit';

let app: ReturnType<typeof createApp>;
let adminAuth: { Authorization: string };
let studentAuth: { Authorization: string };

beforeEach(async () => {
  const kit = makeRegistryKit();
  app = createApp({ authService: kit.authService, registry: kit.registry });
  const a = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@campus.edu', password: ADMIN_PASSWORD });
  adminAuth = { Authorization: `Bearer ${a.body.token}` };
  const s = await request(app).post('/api/auth/signup').send(signUpInput);
  studentAuth = { Authorization: `Bearer ${s.body.token}` };
});

describe('public and logged-in reads', () => {
  it('lists sections without a token, with display names', async () => {
    const res = await request(app).get('/api/sections');
    expect(res.status).toBe(200);
    expect(res.body.map((s: { name: string }) => s.name)).toContain('IT-A (Year 2)');
  });

  it('needs a token for clubs and positions (401), and any student may read them', async () => {
    expect((await request(app).get('/api/clubs')).status).toBe(401);
    expect((await request(app).get('/api/clubs').set(studentAuth)).status).toBe(200);
    expect((await request(app).get(`/api/clubs/${CLUB_ID}`).set(studentAuth)).status).toBe(200);
    expect((await request(app).get(`/api/clubs/${CLUB_ID}/members`).set(studentAuth)).status).toBe(
      200
    );
    expect((await request(app).get('/api/positions').set(studentAuth)).status).toBe(200);
  });

  it('returns 400 for a malformed id and 404 for an unknown club', async () => {
    expect((await request(app).get('/api/clubs/not-a-uuid').set(studentAuth)).status).toBe(400);
    const unknown = '99999999-9999-4999-8999-999999999999';
    expect((await request(app).get(`/api/clubs/${unknown}`).set(studentAuth)).status).toBe(404);
  });
});

describe('changes need MANAGE_REGISTRY', () => {
  it('answers 403 to a student on every write and on student admin', async () => {
    const calls = [
      request(app).post('/api/clubs').set(studentAuth).send({ name: 'X' }),
      request(app).patch(`/api/clubs/${CLUB_ID}`).set(studentAuth).send({ name: 'X' }),
      request(app).post('/api/positions').set(studentAuth).send({}),
      request(app).patch(`/api/positions/${POSITION_ID}`).set(studentAuth).send({ name: 'X' }),
      request(app).get('/api/students').set(studentAuth),
      request(app).get(`/api/students/${STUDENT_ID}`).set(studentAuth),
      request(app).patch(`/api/students/${STUDENT_ID}`).set(studentAuth).send({ name: 'X' }),
      request(app).delete(`/api/students/${STUDENT_ID}`).set(studentAuth),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(403);
  });

  it('lets an admin create (201), duplicate (409), and edit a club', async () => {
    const created = await request(app)
      .post('/api/clubs')
      .set(adminAuth)
      .send({ name: 'Music Club', description: 'Jam' });
    expect(created.status).toBe(201);
    const dup = await request(app).post('/api/clubs').set(adminAuth).send({ name: 'Music Club' });
    expect(dup.status).toBe(409);
    const edit = await request(app)
      .patch(`/api/clubs/${created.body.clubId}`)
      .set(adminAuth)
      .send({ description: 'New' });
    expect(edit.body.description).toBe('New');
    const empty = await request(app).patch(`/api/clubs/${CLUB_ID}`).set(adminAuth).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates a position against its scope (400) and rejects duplicates (409)', async () => {
    const bad = await request(app)
      .post('/api/positions')
      .set(adminAuth)
      .send({ name: 'Odd', scopeType: 'SECTION', permissions: ['MANAGE_ROLES'] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_POSITION');
    const dup = await request(app)
      .post('/api/positions')
      .set(adminAuth)
      .send({ name: 'Club Secretary', scopeType: 'CLUB', permissions: [] });
    expect(dup.status).toBe(409);
    const unknownPerm = await request(app)
      .post('/api/positions')
      .set(adminAuth)
      .send({ name: 'Z', scopeType: 'CLUB', permissions: ['FLY'] });
    expect(unknownPerm.status).toBe(400);
  });

  it('searches, views, edits and soft-deletes a student, never returning a hash', async () => {
    const search = await request(app).get('/api/students?enrollmentNo=iit2025').set(adminAuth);
    expect(search.status).toBe(200);
    expect(search.body[0].enrollmentNo).toBe('IIT2025001');
    expect(JSON.stringify(search.body)).not.toMatch(/hash|email/i);

    const edit = await request(app)
      .patch(`/api/students/${STUDENT_ID}`)
      .set(adminAuth)
      .send({ name: 'Asha K', enrollmentNo: 'HACK1' });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ name: 'Asha K', enrollmentNo: 'IIT2025001' });

    expect((await request(app).delete(`/api/students/${STUDENT_ID}`).set(adminAuth)).status).toBe(
      204
    );
    expect((await request(app).get(`/api/students/${STUDENT_ID}`).set(adminAuth)).status).toBe(404);
  });
});

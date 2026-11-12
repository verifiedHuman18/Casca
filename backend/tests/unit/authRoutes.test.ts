import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { Admin } from '../../src/domain/Admin';
import { errorHandler } from '../../src/middleware/errorHandler';
import { createAuthLimiters, DEFAULT_LIMITS } from '../../src/middleware/rateLimiters';
import { createRequireAuth } from '../../src/middleware/requireAuth';
import { requirePermission } from '../../src/middleware/requirePermission';
import { PermissionService } from '../../src/services/PermissionService';
import { makeAuthKit, SECTION_ID, signUpInput } from './authTestKit';

const admin = new Admin({
  userId: 'admin-1',
  name: 'Admin',
  email: 'admin@campus.edu',
  passwordHash: 'hashed:admin password',
});

function setup(limitOverrides = {}) {
  const kit = makeAuthKit([admin]);
  const limiters = createAuthLimiters({ ...DEFAULT_LIMITS, ...limitOverrides });
  return { ...kit, app: createApp({ authService: kit.service, limiters }) };
}

describe('POST /api/auth/signup', () => {
  it('creates the account (201) and never returns a hash', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/auth/signup').send(signUpInput);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.enrollmentNo).toBe('IIT2025257');
    expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
  });

  it('returns 409 for a duplicate, 404 for an unknown section, 400 for bad input', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/signup').send(signUpInput);
    const dup = await request(app).post('/api/auth/signup').send(signUpInput);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ENROLLMENT_EXISTS');

    const unknown = await request(app)
      .post('/api/auth/signup')
      .send({
        ...signUpInput,
        enrollmentNo: 'IIT2025999',
        sectionId: '22222222-2222-4222-8222-222222222222',
      });
    expect(unknown.status).toBe(404);

    const bad = await request(app)
      .post('/api/auth/signup')
      .send({ ...signUpInput, sectionId: 'not-a-uuid', name: '' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'name',
      'sectionId',
    ]);
  });

  it('returns 400 for malformed JSON in the common error shape', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in a student and an admin, and gives one generic 401', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/signup').send(signUpInput);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ enrollmentNo: 'iit2025257', password: 'correct horse' });
    expect(ok.status).toBe(200);

    const adminOk = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'admin password' });
    expect(adminOk.status).toBe(200);
    expect(adminOk.body.user.type).toBe('ADMIN');

    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ enrollmentNo: 'IIT2025257', password: 'nope nope nope' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ enrollmentNo: 'NOBODY1', password: 'nope nope nope' });
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('needs exactly one of enrollmentNo or email', async () => {
    const { app } = setup();
    const none = await request(app).post('/api/auth/login').send({ password: 'x' });
    const both = await request(app)
      .post('/api/auth/login')
      .send({ enrollmentNo: 'A1234', email: 'a@b.c', password: 'x' });
    expect(none.status).toBe(400);
    expect(both.status).toBe(400);
  });

  it('answers 429 in the error shape after too many failures for one account', async () => {
    const { app } = setup({ loginPerAccount: 2 });
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .send({ enrollmentNo: 'IIT2025257', password: 'bad bad bad' });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('logout and change password', () => {
  it('need a token (401), and change-password works end to end', async () => {
    const { app } = setup();
    const { body } = await request(app).post('/api/auth/signup').send(signUpInput);
    const auth = { Authorization: `Bearer ${body.token}` };

    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
    expect((await request(app).post('/api/auth/logout').set(auth)).status).toBe(204);

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'wrong wrong', newPassword: 'brand new pass' });
    expect(wrong.status).toBe(401);

    const done = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'correct horse', newPassword: 'brand new pass' });
    expect(done.status).toBe(204);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ enrollmentNo: 'IIT2025257', password: 'brand new pass' });
    expect(login.status).toBe(200);
  });
});

describe('requireAuth and requirePermission', () => {
  const { service } = makeAuthKit([admin]);
  const permissions = new PermissionService();
  const requireAuth = createRequireAuth(service);
  const app = express();
  app.get('/protected', requireAuth, (_req, res) => void res.json({ ok: true }));
  app.get(
    '/registry',
    requireAuth,
    requirePermission(user => permissions.canManageRegistry(user)),
    (_req, res) => void res.json({ ok: true })
  );
  app.use(errorHandler);

  it('returns 401 without a token or with a bad one', async () => {
    expect((await request(app).get('/protected')).status).toBe(401);
    expect((await request(app).get('/protected').set('Authorization', 'Bearer junk')).status).toBe(
      401
    );
    expect((await request(app).get('/protected').set('Authorization', 'Token abc')).status).toBe(
      401
    );
  });

  it('returns 403 for a student and 200 for an admin on a permission-guarded route', async () => {
    const student = await service.signUp({ ...signUpInput, sectionId: SECTION_ID });
    const adminLogin = await service.login({
      email: 'admin@campus.edu',
      password: 'admin password',
    });

    const forbidden = await request(app)
      .get('/registry')
      .set('Authorization', `Bearer ${student.token}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const allowed = await request(app)
      .get('/registry')
      .set('Authorization', `Bearer ${adminLogin.token}`);
    expect(allowed.status).toBe(200);
  });
});

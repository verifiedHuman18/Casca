import fs from 'node:fs';
import path from 'node:path';
import { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import request from 'supertest';
import { createApp } from '../../src/app';
import { createAuthLimiters, DEFAULT_LIMITS } from '../../src/middleware/rateLimiters';
import { PostgresAdminRepository } from '../../src/repositories/postgres/PostgresAdminRepository';
import { PostgresClubRepository } from '../../src/repositories/postgres/PostgresClubRepository';
import { PostgresPositionRepository } from '../../src/repositories/postgres/PostgresPositionRepository';
import { PostgresRoleAssignmentRepository } from '../../src/repositories/postgres/PostgresRoleAssignmentRepository';
import { PostgresSectionRepository } from '../../src/repositories/postgres/PostgresSectionRepository';
import { PostgresStudentRepository } from '../../src/repositories/postgres/PostgresStudentRepository';
import { AuthService } from '../../src/services/AuthService';
import { PermissionService } from '../../src/services/PermissionService';
import { RegistryService } from '../../src/services/RegistryService';
import { RoleService } from '../../src/services/RoleService';
import { fastHasher, SECRET } from '../unit/authTestKit';
import { RecordingAudit } from '../unit/registryKit';
import { insertClub, insertPosition, insertSection } from './fixtures';

export const ADMIN_EMAIL = 'admin@campus.edu';
export const ADMIN_PASSWORD = 'admin password';
export const STUDENT_PASSWORD = 'correct horse';

export type Auth = { Authorization: string };

/** The real app on the real Postgres repositories. Only the password hasher is the fast one. */
export function buildApi(pool: Pool) {
  const assignments = new PostgresRoleAssignmentRepository(pool);
  const students = new PostgresStudentRepository(pool, assignments);
  const sections = new PostgresSectionRepository(pool);
  const clubs = new PostgresClubRepository(pool);
  const positions = new PostgresPositionRepository(pool);
  const permissions = new PermissionService();
  const audit = new RecordingAudit();
  const authService = new AuthService(
    {
      students,
      admins: new PostgresAdminRepository(pool),
      sections,
      assignments,
      passwords: fastHasher,
    },
    { jwtSecret: SECRET, jwtExpiresInSeconds: 3600 }
  );
  const app = createApp({
    authService,
    permissions,
    pool,
    // Tests sign up and log in from one address, so the limits are lifted here only.
    limiters: createAuthLimiters({
      ...DEFAULT_LIMITS,
      signupPerIp: 10_000,
      loginPerIp: 10_000,
      loginPerAccount: 10_000,
    }),
    registry: new RegistryService({ sections, students, clubs, positions, audit }),
    roles: new RoleService({
      assignments,
      students,
      positions,
      clubs,
      sections,
      permissions,
      audit,
    }),
  });
  return { app, permissions };
}

/** The events tables live in their own migration file (backend/sql). */
export async function applyEventsSchema(pool: Pool): Promise<void> {
  const file = path.resolve(__dirname, '../../src/db/migrations/003_events_schema.sql');
  await pool.query(fs.readFileSync(file, 'utf8'));
}

export async function resetEvents(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE event_sections, events CASCADE');
}

/** One section, two clubs, the positions the scenarios need, and an admin account. */
export async function seedCampus(pool: Pool) {
  const section = await insertSection(pool, 'IT', 'A', 2);
  const clubX = await insertClub(pool, 'Club X');
  const clubY = await insertClub(pool, 'Club Y');
  const member = await insertPosition(pool, 'Club Member', ScopeType.CLUB, []);
  const secretary = await insertPosition(pool, 'Club Secretary', ScopeType.CLUB, [
    Permission.CREATE_CLUB_EVENT,
    Permission.REQUEST_CAMPUS_EVENT,
    Permission.EDIT_ANY_IN_SCOPE,
  ]);
  await pool.query(
    `INSERT INTO users (user_id, name, email, password_hash, user_type)
     VALUES (gen_random_uuid(), 'Admin', $1, $2, 'ADMIN')`,
    [ADMIN_EMAIL, `hashed:${ADMIN_PASSWORD}`]
  );
  return { section, clubX, clubY, member, secretary };
}

type App = ReturnType<typeof buildApi>['app'];

export async function loginAdmin(app: App): Promise<Auth> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return { Authorization: `Bearer ${res.body.token}` };
}

export async function signUp(app: App, sectionId: string, enrollmentNo: string) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Student', enrollmentNo, sectionId, password: STUDENT_PASSWORD });
  return {
    auth: { Authorization: `Bearer ${res.body.token}` } as Auth,
    userId: res.body.user.userId as string,
  };
}

export async function assignRole(
  app: App,
  admin: Auth,
  body: { studentId: string; positionId: string; clubId?: string; sectionId?: string }
) {
  return request(app).post('/api/role-assignments').set(admin).send(body);
}

export const clubEvent = (clubId: string, title = 'Hack night') => ({
  scope: 'CLUB',
  title,
  description: 'Bring a laptop',
  venue: 'Lab 1',
  startTime: '2030-01-10T10:00:00Z',
  endTime: '2030-01-10T12:00:00Z',
  clubId,
  clubVisibility: 'PUBLIC',
});

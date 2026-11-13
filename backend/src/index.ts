import { createApp } from './app';
import { loadAuthConfig } from './config/authConfig';
import { pool } from './db/pool';
import { PostgresAdminRepository } from './repositories/postgres/PostgresAdminRepository';
import { PostgresClubRepository } from './repositories/postgres/PostgresClubRepository';
import { PostgresPositionRepository } from './repositories/postgres/PostgresPositionRepository';
import { PostgresRoleAssignmentRepository } from './repositories/postgres/PostgresRoleAssignmentRepository';
import { PostgresSectionRepository } from './repositories/postgres/PostgresSectionRepository';
import { PostgresStudentRepository } from './repositories/postgres/PostgresStudentRepository';
import { ConsoleAuditLog } from './services/AuditLog';
import { AuthService } from './services/AuthService';
import { PasswordHasher } from './services/PasswordHasher';
import { RegistryService } from './services/RegistryService';

/** Composition root: the only place that picks the real implementations. */
const assignments = new PostgresRoleAssignmentRepository(pool);
const students = new PostgresStudentRepository(pool, assignments);
const sections = new PostgresSectionRepository(pool);

const authService = new AuthService(
  {
    students,
    admins: new PostgresAdminRepository(pool),
    sections,
    assignments,
    passwords: new PasswordHasher(),
  },
  loadAuthConfig()
);
const registry = new RegistryService({
  sections,
  students,
  clubs: new PostgresClubRepository(pool),
  positions: new PostgresPositionRepository(pool),
  audit: new ConsoleAuditLog(),
});
const app = createApp({
  authService,
  registry,
  pool,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true',
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.info(`Campus Management Platform API listening on port ${port}`);
});

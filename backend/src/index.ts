import { createApp } from './app';
import { loadAuthConfig } from './config/authConfig';
import { pool } from './db/pool';
import { PostgresAdminRepository } from './repositories/postgres/PostgresAdminRepository';
import { PostgresRoleAssignmentRepository } from './repositories/postgres/PostgresRoleAssignmentRepository';
import { PostgresSectionRepository } from './repositories/postgres/PostgresSectionRepository';
import { PostgresStudentRepository } from './repositories/postgres/PostgresStudentRepository';
import { AuthService } from './services/AuthService';
import { PasswordHasher } from './services/PasswordHasher';

/** Composition root: the only place that picks the real implementations. */
const assignments = new PostgresRoleAssignmentRepository(pool);

const authService = new AuthService(
  {
    students: new PostgresStudentRepository(pool, assignments),
    admins: new PostgresAdminRepository(pool),
    sections: new PostgresSectionRepository(pool),
    assignments,
    passwords: new PasswordHasher(),
  },
  loadAuthConfig()
);
const app = createApp({
  authService,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true',
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.info(`Campus Management Platform API listening on port ${port}`);
});

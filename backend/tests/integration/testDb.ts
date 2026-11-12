import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from '../../src/db/migrator';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export function createTestPool(): Pool {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  if (/aiven/i.test(url)) throw new Error('Refusing to run tests against Aiven');
  return new Pool({ connectionString: url, max: 3 });
}

export async function prepareDatabase(pool: Pool): Promise<void> {
  await runMigrations(pool);
}

export async function resetData(pool: Pool): Promise<void> {
  await pool.query(
    'TRUNCATE role_assignments, students, users, position_permissions, positions, clubs, sections CASCADE'
  );
}

import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresAdminRepository } from '../../src/repositories/postgres/PostgresAdminRepository';
import { fakePasswords, insertAdmin } from './fixtures';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresAdminRepository', () => {
  let pool: Pool;
  let repo: PostgresAdminRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    repo = new PostgresAdminRepository(pool);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  it('finds an admin by id and by email ignoring case', async () => {
    const admin = await insertAdmin(pool, 'boss@example.com');
    expect((await repo.findById(admin.userId))?.email).toBe('boss@example.com');
    expect((await repo.findByEmail('BOSS@Example.com'))?.userId).toBe(admin.userId);
  });

  it('returns null for unknown or inactive admins', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
    const admin = await insertAdmin(pool);
    await pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [admin.userId]);
    expect(await repo.findByEmail('admin@example.com')).toBeNull();
  });

  it('persists a new name and password hash', async () => {
    const admin = await insertAdmin(pool);
    admin.rename('Boss');
    await admin.changePassword('hash', 'new-password-1', fakePasswords);
    await repo.update(admin);
    const loaded = await repo.findById(admin.userId);
    expect(loaded?.name).toBe('Boss');
    expect(loaded?.getPasswordHashForPersistence()).toBe('H:new-password-1');
  });

  it('update on an unknown admin is NOT_FOUND', async () => {
    const admin = await insertAdmin(pool);
    await pool.query('DELETE FROM users WHERE user_id = $1', [admin.userId]);
    await expect(repo.update(admin)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

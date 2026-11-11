import { randomUUID } from 'node:crypto';
import { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/domain/DomainError';
import { Position } from '../../src/domain/Position';
import { PostgresPositionRepository } from '../../src/repositories/postgres/PostgresPositionRepository';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresPositionRepository', () => {
  let pool: Pool;
  let repo: PostgresPositionRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    repo = new PostgresPositionRepository(pool);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  const secretary = (id = randomUUID()) =>
    new Position(id, 'Club Secretary', ScopeType.CLUB, [
      Permission.CREATE_CLUB_EVENT,
      Permission.EDIT_ANY_IN_SCOPE,
    ]);

  it('stores and reloads a position with its permissions', async () => {
    const p = secretary();
    await repo.add(p);
    const found = await repo.findById(p.positionId);
    expect(found?.name).toBe('Club Secretary');
    expect(found?.scopeType).toBe(ScopeType.CLUB);
    expect([...(found?.permissions ?? [])].sort()).toEqual(
      [Permission.CREATE_CLUB_EVENT, Permission.EDIT_ANY_IN_SCOPE].sort()
    );
  });

  it('keeps an empty permission set (Club Member)', async () => {
    const member = new Position(randomUUID(), 'Club Member', ScopeType.CLUB, []);
    await repo.add(member);
    expect((await repo.findById(member.positionId))?.permissions.size).toBe(0);
  });

  it('finds by name and lists all ordered by name', async () => {
    await repo.add(secretary());
    await repo.add(new Position(randomUUID(), 'Club Member', ScopeType.CLUB, []));
    expect((await repo.findByName('Club Member'))?.name).toBe('Club Member');
    expect((await repo.findAll()).map(p => p.name)).toEqual(['Club Member', 'Club Secretary']);
  });

  it('update replaces the permission set', async () => {
    const p = secretary();
    await repo.add(p);
    await repo.update(
      new Position(p.positionId, p.name, p.scopeType, [Permission.REQUEST_CAMPUS_EVENT])
    );
    const found = await repo.findById(p.positionId);
    expect([...(found?.permissions ?? [])]).toEqual([Permission.REQUEST_CAMPUS_EVENT]);
  });

  it('rejects a duplicate name with POSITION_EXISTS', async () => {
    await repo.add(secretary());
    await expect(repo.add(secretary())).rejects.toMatchObject({
      constructor: DomainError,
      code: 'POSITION_EXISTS',
    });
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});

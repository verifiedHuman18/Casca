import { randomUUID } from 'node:crypto';
import { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Club } from '../../src/domain/Club';
import { PostgresClubRepository } from '../../src/repositories/postgres/PostgresClubRepository';
import { PostgresRoleAssignmentRepository } from '../../src/repositories/postgres/PostgresRoleAssignmentRepository';
import {
  buildAssignment,
  insertAdmin,
  insertPosition,
  insertSection,
  insertStudent,
} from './fixtures';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresClubRepository', () => {
  let pool: Pool;
  let repo: PostgresClubRepository;
  let assignments: PostgresRoleAssignmentRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    repo = new PostgresClubRepository(pool);
    assignments = new PostgresRoleAssignmentRepository(pool);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  it('adds a club and finds it with no members', async () => {
    const club = new Club(randomUUID(), 'Coding Club', 'We code');
    await repo.add(club);
    const found = await repo.findById(club.clubId);
    expect(found?.name).toBe('Coding Club');
    expect(found?.description).toBe('We code');
    expect(found?.getMembers()).toEqual([]);
  });

  it('derives members and office bearers from active assignments', async () => {
    const section = await insertSection(pool);
    const admin = await insertAdmin(pool);
    const s1 = await insertStudent(pool, section, 'IIT2025001');
    const s2 = await insertStudent(pool, section, 'IIT2025002');
    const s3 = await insertStudent(pool, section, 'IIT2025003');
    const club = new Club(randomUUID(), 'Coding Club', '');
    await repo.add(club);
    const secretary = await insertPosition(pool, 'Club Secretary', ScopeType.CLUB, [
      Permission.CREATE_CLUB_EVENT,
    ]);
    const member = await insertPosition(pool, 'Club Member', ScopeType.CLUB, []);
    await assignments.add(buildAssignment(s1.userId, secretary, { club }, admin.userId));
    await assignments.add(buildAssignment(s2.userId, member, { club }, admin.userId));
    await assignments.add(
      buildAssignment(s3.userId, member, { club }, admin.userId, new Date(Date.now() - 1000))
    );

    const found = await repo.findById(club.clubId);
    expect(found?.getMembers().sort()).toEqual([s1.userId, s2.userId].sort());
    expect(found?.getOfficeBearers().map(a => a.studentId)).toEqual([s1.userId]);
    expect(found?.getOfficeBearers()[0].club).toBe(found);
  });

  it('lists clubs by name with each club’s own assignments', async () => {
    const section = await insertSection(pool);
    const admin = await insertAdmin(pool);
    const s1 = await insertStudent(pool, section);
    const music = new Club(randomUUID(), 'Music Club', '');
    const coding = new Club(randomUUID(), 'Coding Club', '');
    await repo.add(music);
    await repo.add(coding);
    const member = await insertPosition(pool, 'Club Member', ScopeType.CLUB, []);
    await assignments.add(buildAssignment(s1.userId, member, { club: coding }, admin.userId));

    const all = await repo.findAll();
    expect(all.map(c => c.name)).toEqual(['Coding Club', 'Music Club']);
    expect(all[0].getMembers()).toEqual([s1.userId]);
    expect(all[1].getMembers()).toEqual([]);
  });

  it('updates name and description', async () => {
    const club = new Club(randomUUID(), 'Old', '');
    await repo.add(club);
    club.rename('New');
    club.describe('About');
    await repo.update(club);
    const found = await repo.findById(club.clubId);
    expect(found?.name).toBe('New');
    expect(found?.description).toBe('About');
  });

  it('rejects a duplicate name and an update of an unknown club', async () => {
    await repo.add(new Club(randomUUID(), 'Coding Club', ''));
    await expect(repo.add(new Club(randomUUID(), 'Coding Club', ''))).rejects.toMatchObject({
      code: 'CLUB_EXISTS',
    });
    await expect(repo.update(new Club(randomUUID(), 'Ghost', ''))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});

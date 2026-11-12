import { randomUUID } from 'node:crypto';
import { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresRoleAssignmentRepository } from '../../src/repositories/postgres/PostgresRoleAssignmentRepository';
import {
  buildAssignment,
  insertAdmin,
  insertClub,
  insertPosition,
  insertSection,
  insertStudent,
} from './fixtures';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresRoleAssignmentRepository', () => {
  let pool: Pool;
  let repo: PostgresRoleAssignmentRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    repo = new PostgresRoleAssignmentRepository(pool);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  async function setup() {
    const section = await insertSection(pool);
    const student = await insertStudent(pool, section);
    const admin = await insertAdmin(pool);
    const club = await insertClub(pool);
    const secretary = await insertPosition(pool, 'Club Secretary', ScopeType.CLUB, [
      Permission.CREATE_CLUB_EVENT,
    ]);
    const cr = await insertPosition(pool, 'Class Representative', ScopeType.SECTION, [
      Permission.CREATE_SECTION_EVENT,
    ]);
    return { section, student, admin, club, secretary, cr };
  }

  it('stores an assignment and loads it with position, permissions and club', async () => {
    const { student, admin, club, secretary } = await setup();
    const a = buildAssignment(student.userId, secretary, { club }, admin.userId);
    await repo.add(a);
    const [loaded] = await repo.findActiveByStudent(student.userId);
    expect(loaded.id).toBe(a.id);
    expect(loaded.position.name).toBe('Club Secretary');
    expect(loaded.position.allows(Permission.CREATE_CLUB_EVENT)).toBe(true);
    expect(loaded.club?.clubId).toBe(club.clubId);
    expect(loaded.section).toBeNull();
  });

  it('loads a section-scoped assignment with its section', async () => {
    const { student, admin, section, cr } = await setup();
    await repo.add(buildAssignment(student.userId, cr, { section }, admin.userId));
    const [loaded] = await repo.findActiveByStudent(student.userId);
    expect(loaded.section?.sectionId).toBe(section.sectionId);
    expect(loaded.club).toBeNull();
  });

  it('findActiveByStudent skips ended assignments but keeps future-dated ones', async () => {
    const { student, admin, club, secretary, cr, section } = await setup();
    const day = 24 * 60 * 60 * 1000;
    await repo.add(
      buildAssignment(student.userId, secretary, { club }, admin.userId, new Date(Date.now() - day))
    );
    await repo.add(
      buildAssignment(student.userId, cr, { section }, admin.userId, new Date(Date.now() + day))
    );
    const active = await repo.findActiveByStudent(student.userId);
    expect(active.map(a => a.position.name)).toEqual(['Class Representative']);
    expect(await repo.findByStudent(student.userId, 10, 0)).toHaveLength(2);
  });

  it('rejects a second open-ended identical assignment', async () => {
    const { student, admin, club, secretary } = await setup();
    await repo.add(buildAssignment(student.userId, secretary, { club }, admin.userId));
    await expect(
      repo.add(buildAssignment(student.userId, secretary, { club }, admin.userId))
    ).rejects.toMatchObject({ code: 'DUPLICATE_ASSIGNMENT' });
  });

  it('reports active duplicates, treating null club and section as equal', async () => {
    const { student, admin, club, section, secretary, cr } = await setup();
    await repo.add(buildAssignment(student.userId, secretary, { club }, admin.userId));
    await repo.add(buildAssignment(student.userId, cr, { section }, admin.userId));
    expect(
      await repo.hasActiveDuplicate(student.userId, secretary.positionId, club.clubId, null)
    ).toBe(true);
    expect(
      await repo.hasActiveDuplicate(student.userId, secretary.positionId, randomUUID(), null)
    ).toBe(false);
    expect(
      await repo.hasActiveDuplicate(student.userId, cr.positionId, null, section.sectionId)
    ).toBe(true);
  });

  it('updateEndsOn persists a revoke and allows assigning again later', async () => {
    const { student, admin, club, secretary } = await setup();
    const first = buildAssignment(student.userId, secretary, { club }, admin.userId);
    await repo.add(first);
    first.end(new Date());
    await repo.updateEndsOn(first);
    expect(
      await repo.findActiveByStudent(student.userId, new Date(Date.now() + 1000))
    ).toHaveLength(0);
    await repo.add(buildAssignment(student.userId, secretary, { club }, admin.userId));
    expect(await repo.findByStudent(student.userId, 10, 0)).toHaveLength(2);
  });

  it('updateEndsOn on an unknown assignment is NOT_FOUND', async () => {
    const { student, admin, club, secretary } = await setup();
    const ghost = buildAssignment(student.userId, secretary, { club }, admin.userId);
    await expect(repo.updateEndsOn(ghost)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('findById returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});

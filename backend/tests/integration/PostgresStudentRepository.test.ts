import { randomUUID } from 'node:crypto';
import { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresRoleAssignmentRepository } from '../../src/repositories/postgres/PostgresRoleAssignmentRepository';
import { PostgresStudentRepository } from '../../src/repositories/postgres/PostgresStudentRepository';
import {
  buildAssignment,
  buildStudent,
  fakePasswords,
  insertAdmin,
  insertClub,
  insertPosition,
  insertSection,
  insertStudent,
} from './fixtures';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresStudentRepository', () => {
  let pool: Pool;
  let assignments: PostgresRoleAssignmentRepository;
  let repo: PostgresStudentRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    assignments = new PostgresRoleAssignmentRepository(pool);
    repo = new PostgresStudentRepository(pool, assignments);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  it('creates a student and finds it by id and by normalised enrollment number', async () => {
    const section = await insertSection(pool);
    const s = await insertStudent(pool, section, ' iit2025001 ');
    expect((await repo.findById(s.userId))?.enrollmentNo).toBe('IIT2025001');
    const byEnrollment = await repo.findByEnrollmentNo('iit2025001');
    expect(byEnrollment?.userId).toBe(s.userId);
    expect(byEnrollment?.section.getName()).toBe('IT-A (Year 2)');
    expect(byEnrollment?.getYear()).toBe(2);
  });

  it('loads the active assignments so getClubs works', async () => {
    const section = await insertSection(pool);
    const s = await insertStudent(pool, section);
    const admin = await insertAdmin(pool);
    const club = await insertClub(pool);
    const member = await insertPosition(pool, 'Club Member', ScopeType.CLUB, []);
    await assignments.add(buildAssignment(s.userId, member, { club }, admin.userId));
    const loaded = await repo.findById(s.userId);
    expect(loaded?.getClubs().map(c => c.clubId)).toEqual([club.clubId]);
    expect(
      loaded?.hasPermission(Permission.CREATE_CLUB_EVENT, {
        scopeType: ScopeType.CLUB,
        clubId: club.clubId,
      })
    ).toBe(false);
  });

  it('rejects a duplicate enrollment number and a duplicate email', async () => {
    const section = await insertSection(pool);
    await insertStudent(pool, section, 'IIT2025001', 'a@x.com');
    await expect(repo.create(buildStudent(section, 'IIT2025001'))).rejects.toMatchObject({
      code: 'ENROLLMENT_EXISTS',
    });
    await expect(repo.create(buildStudent(section, 'IIT2025002', 'A@X.com'))).rejects.toMatchObject(
      {
        code: 'EMAIL_EXISTS',
      }
    );
    expect(await repo.findByEnrollmentNo('IIT2025002')).toBeNull();
  });

  it('updates name, section (the course follows) and password hash', async () => {
    const itA = await insertSection(pool);
    const biC = await insertSection(pool, 'IT-BI', 'C', 2);
    const s = await insertStudent(pool, itA);
    s.rename('New Name');
    s.moveToSection(biC);
    await s.changePassword('hash', 'new-password-1', fakePasswords);
    await repo.update(s);
    const loaded = await repo.findById(s.userId);
    expect(loaded?.name).toBe('New Name');
    expect(loaded?.section.sectionId).toBe(biC.sectionId);
    expect(loaded?.course).toBe('IT-BI');
    expect(loaded?.getPasswordHashForPersistence()).toBe('H:new-password-1');
  });

  it('soft delete hides the student but keeps the enrollment number reserved', async () => {
    const section = await insertSection(pool);
    const s = await insertStudent(pool, section);
    await repo.deactivate(s.userId);
    expect(await repo.findById(s.userId)).toBeNull();
    expect(await repo.findByEnrollmentNo(s.enrollmentNo)).toBeNull();
    expect(await repo.search('', 10, 0)).toHaveLength(0);
    expect(await repo.existsByEnrollmentNo(s.enrollmentNo)).toBe(true);
    await expect(repo.deactivate(randomUUID())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('searches by enrollment prefix with paging and treats % literally', async () => {
    const section = await insertSection(pool);
    await insertStudent(pool, section, 'IIT2025001');
    await insertStudent(pool, section, 'IIT2025002');
    await insertStudent(pool, section, 'ABC1');
    expect((await repo.search('iit', 10, 0)).map(s => s.enrollmentNo)).toEqual([
      'IIT2025001',
      'IIT2025002',
    ]);
    expect((await repo.search('iit', 1, 1)).map(s => s.enrollmentNo)).toEqual(['IIT2025002']);
    expect(await repo.search('%', 10, 0)).toHaveLength(0);
  });

  it('existsByEnrollmentNo is false for an unknown number', async () => {
    expect(await repo.existsByEnrollmentNo('NOPE')).toBe(false);
  });
});

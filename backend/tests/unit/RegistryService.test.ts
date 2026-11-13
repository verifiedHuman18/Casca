import { Permission, ScopeType, UserType, type AuthUser } from '@senoom/shared';
import { describe, expect, it } from 'vitest';
import { CLUB_ID, makeRegistryKit, POSITION_ID, SECTION_2_ID, STUDENT_ID } from './registryKit';

const actor: AuthUser = {
  userId: 'admin-1',
  name: 'Admin',
  type: UserType.ADMIN,
  enrollmentNo: null,
  sectionId: null,
  course: null,
  year: null,
  assignments: [],
  clubIds: [],
};

describe('clubs', () => {
  it('shows office bearers by name and position, members by name and section', async () => {
    const { registry } = makeRegistryKit();
    const detail = await registry.getClub(CLUB_ID);
    expect(detail.officeBearers).toEqual([
      { studentId: STUDENT_ID, name: 'Asha', positionName: 'Club Secretary' },
    ]);
    const members = await registry.listClubMembers(CLUB_ID);
    expect(members).toEqual([
      { studentId: STUDENT_ID, name: 'Asha', sectionName: 'IT-A (Year 2)' },
    ]);
    expect(JSON.stringify(members)).not.toMatch(/enrollment|hash|email/i);
  });

  it('leaves removed students out of the club lists', async () => {
    const { registry } = makeRegistryKit();
    await registry.removeStudent(actor, STUDENT_ID);
    expect((await registry.getClub(CLUB_ID)).officeBearers).toEqual([]);
    expect(await registry.listClubMembers(CLUB_ID)).toEqual([]);
  });

  it('creates and edits a club, rejects duplicates, and audits changes', async () => {
    const { registry, audit } = makeRegistryKit();
    const created = await registry.createClub(actor, { name: 'Music Club', description: '' });
    await registry.updateClub(actor, created.clubId, { description: 'Jam sessions' });
    await expect(
      registry.createClub(actor, { name: 'Music Club', description: '' })
    ).rejects.toMatchObject({ code: 'CLUB_EXISTS' });
    await expect(registry.getClub('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(audit.entries.map(e => e.action)).toEqual(['CLUB_CREATED', 'CLUB_UPDATED']);
    expect(audit.entries[0]).toMatchObject({ actorId: 'admin-1', targetId: created.clubId });
  });
});

describe('positions', () => {
  it('rejects permissions that do not fit the scope', async () => {
    const { registry } = makeRegistryKit();
    await expect(
      registry.createPosition(actor, {
        name: 'Odd',
        scopeType: ScopeType.SECTION,
        permissions: [Permission.MANAGE_ROLES],
      })
    ).rejects.toMatchObject({ code: 'INVALID_POSITION' });
  });

  it('creates a position and rejects a duplicate name', async () => {
    const { registry } = makeRegistryKit();
    await registry.createPosition(actor, {
      name: 'Treasurer',
      scopeType: ScopeType.CLUB,
      permissions: [Permission.CREATE_CLUB_EVENT],
    });
    await expect(
      registry.createPosition(actor, {
        name: 'Treasurer',
        scopeType: ScopeType.CLUB,
        permissions: [],
      })
    ).rejects.toMatchObject({ code: 'POSITION_EXISTS' });
  });

  it('updates permissions but keeps the scope, and checks the new permissions', async () => {
    const { registry } = makeRegistryKit();
    const updated = await registry.updatePosition(actor, POSITION_ID, {
      permissions: [Permission.EDIT_ANY_IN_SCOPE],
    });
    expect(updated.scopeType).toBe(ScopeType.CLUB);
    expect([...updated.permissions]).toEqual([Permission.EDIT_ANY_IN_SCOPE]);
    await expect(
      registry.updatePosition(actor, POSITION_ID, { permissions: [Permission.MANAGE_ROLES] })
    ).rejects.toMatchObject({ code: 'INVALID_POSITION' });
    await expect(registry.updatePosition(actor, 'nope', { name: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('refuses a rename onto another position name but allows keeping its own', async () => {
    const { registry } = makeRegistryKit();
    await registry.createPosition(actor, {
      name: 'Treasurer',
      scopeType: ScopeType.CLUB,
      permissions: [],
    });
    await expect(
      registry.updatePosition(actor, POSITION_ID, { name: 'Treasurer' })
    ).rejects.toMatchObject({ code: 'POSITION_EXISTS' });
    await expect(
      registry.updatePosition(actor, POSITION_ID, { name: 'Club Secretary' })
    ).resolves.toBeDefined();
  });
});

describe('students', () => {
  it('searches by enrollment prefix', async () => {
    const { registry } = makeRegistryKit();
    expect(await registry.searchStudents('iit2025', 20, 0)).toHaveLength(1);
    expect(await registry.searchStudents('XYZ', 20, 0)).toHaveLength(0);
  });

  it('changes name and section but never the enrollment number', async () => {
    const { registry } = makeRegistryKit();
    const s = await registry.updateStudent(actor, STUDENT_ID, {
      name: 'Asha K',
      sectionId: SECTION_2_ID,
    });
    expect(s.name).toBe('Asha K');
    expect(s.section.sectionId).toBe(SECTION_2_ID);
    expect(s.enrollmentNo).toBe('IIT2025001');
    await expect(
      registry.updateStudent(actor, STUDENT_ID, { sectionId: 'nope' })
    ).rejects.toMatchObject({ code: 'SECTION_NOT_FOUND' });
  });

  it('soft-deletes: hidden afterwards, number still reserved, second delete is 404', async () => {
    const { registry, students, audit } = makeRegistryKit();
    await registry.removeStudent(actor, STUDENT_ID);
    await expect(registry.getStudent(STUDENT_ID)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(registry.removeStudent(actor, STUDENT_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await students.existsByEnrollmentNo('IIT2025001')).toBe(true);
    expect(audit.entries.at(-1)).toMatchObject({ action: 'STUDENT_REMOVED', targetId: STUDENT_ID });
  });
});

import { describe, expect, it } from 'vitest';
import { Club } from '../../src/domain/Club';
import { DomainError } from '../../src/domain/DomainError';
import type { RoleAssignment } from '../../src/domain/RoleAssignment';
import { assign, clubMember, PAST, secretary } from './factories';

describe('Club', () => {
  const now = new Date('2026-11-12T00:00:00Z');

  function clubWithAssignments() {
    const list: RoleAssignment[] = [];
    const club = new Club('coding', 'Coding Club', '', list);
    list.push(
      assign(secretary, { club }, null, 's1'),
      assign(clubMember, { club }, null, 's2'),
      assign(clubMember, { club }, PAST, 's3')
    );
    return club;
  }

  it('derives members from active assignments only', () => {
    expect(clubWithAssignments().getMembers(now).sort()).toEqual(['s1', 's2']);
  });

  it('office bearers are active assignments with permissions', () => {
    const bearers = clubWithAssignments().getOfficeBearers(now);
    expect(bearers.map(a => a.studentId)).toEqual(['s1']);
  });

  it('renames and re-describes, trimming input', () => {
    const club = new Club('c', 'Old', '');
    club.rename('  New Name ');
    club.describe(' About us ');
    expect(club.name).toBe('New Name');
    expect(club.description).toBe('About us');
  });

  it('rejects an empty name', () => {
    expect(() => new Club('c', '   ', '')).toThrow(DomainError);
  });
});

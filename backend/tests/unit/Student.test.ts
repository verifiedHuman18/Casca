import { Permission, ScopeType } from '@senoom/shared';
import { describe, expect, it } from 'vitest';
import { assign, clubMember, cr, makeClub, makeSection, makeStudent, secretary } from './factories';

describe('Student', () => {
  const sectionA = makeSection('it-a-2');
  const x = makeClub('x');
  const y = makeClub('y');
  const now = new Date('2026-11-11T00:00:00Z');
  const publishX = { scopeType: ScopeType.CLUB, clubId: 'x' } as const;
  const publishY = { scopeType: ScopeType.CLUB, clubId: 'y' } as const;

  it('normalises the enrollment number', () => {
    expect(makeStudent(sectionA).enrollmentNo).toBe('IIT2025257');
  });

  it('takes the year from the section', () => {
    expect(makeStudent(sectionA).getYear()).toBe(2);
  });

  it('secretary of X and member of Y can publish for X but not Y', () => {
    const s = makeStudent(sectionA, [
      assign(secretary, { club: x }),
      assign(clubMember, { club: y }),
    ]);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishX, now)).toBe(true);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishY, now)).toBe(false);
  });

  it('a plain club member cannot publish', () => {
    const s = makeStudent(sectionA, [assign(clubMember, { club: x })]);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishX, now)).toBe(false);
  });

  it('a CR of IT-A cannot publish for IT-B', () => {
    const s = makeStudent(sectionA, [assign(cr, { section: sectionA })]);
    const target = (id: string) => ({ scopeType: ScopeType.SECTION, sectionId: id }) as const;
    expect(s.hasPermission(Permission.CREATE_SECTION_EVENT, target('it-a-2'), now)).toBe(true);
    expect(s.hasPermission(Permission.CREATE_SECTION_EVENT, target('it-b-2'), now)).toBe(false);
  });

  it('loses rights once the assignment has ended', () => {
    const a = assign(secretary, { club: x });
    const s = makeStudent(sectionA, [a]);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishX, now)).toBe(true);
    a.end(now);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishX, now)).toBe(false);
  });

  it('a student with no assignments can do nothing', () => {
    const s = makeStudent(sectionA);
    expect(s.hasPermission(Permission.CREATE_CLUB_EVENT, publishX, now)).toBe(false);
    expect(s.getClubs(now)).toEqual([]);
  });

  it('getClubs returns distinct clubs from active assignments, Club Member included', () => {
    const s = makeStudent(sectionA, [
      assign(secretary, { club: x }),
      assign(clubMember, { club: x }),
      assign(clubMember, { club: y }),
    ]);
    expect(
      s
        .getClubs(now)
        .map(c => c.clubId)
        .sort()
    ).toEqual(['x', 'y']);
  });
});

import { Permission, ScopeType } from '@senoom/shared';
import { Club } from '../../src/domain/Club';
import { Position } from '../../src/domain/Position';
import { RoleAssignment } from '../../src/domain/RoleAssignment';
import { Section } from '../../src/domain/Section';
import { Student } from '../../src/domain/Student';

export const makeSection = (id: string, course = 'IT', label = 'A', year = 2) =>
  new Section(id, course, label, year);

export const makeClub = (id: string, name = id) => new Club(id, name, '');

export const secretary = new Position('p-sec', 'Club Secretary', ScopeType.CLUB, [
  Permission.CREATE_CLUB_EVENT,
  Permission.REQUEST_CAMPUS_EVENT,
  Permission.EDIT_ANY_IN_SCOPE,
]);
export const clubMember = new Position('p-mem', 'Club Member', ScopeType.CLUB, []);
export const cr = new Position('p-cr', 'Class Representative', ScopeType.SECTION, [
  Permission.CREATE_SECTION_EVENT,
]);

export const PAST = new Date('2020-01-01T00:00:00Z');
export const FUTURE = new Date('2099-01-01T00:00:00Z');

export function assign(
  position: Position,
  target: { club?: Club; section?: Section } = {},
  endsOn: Date | null = null,
  studentId = 's1'
) {
  return new RoleAssignment(
    `a-${Math.random()}`,
    studentId,
    position,
    target.club ?? null,
    target.section ?? null,
    'admin1',
    PAST,
    endsOn
  );
}

export function makeStudent(section: Section, assignments: RoleAssignment[] = []) {
  return new Student({
    userId: 's1',
    name: 'Test Student',
    email: null,
    passwordHash: 'hash',
    enrollmentNo: ' iit2025257 ',
    course: 'IT',
    section,
    roleAssignments: assignments,
  });
}

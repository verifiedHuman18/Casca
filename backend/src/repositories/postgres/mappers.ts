import type { Permission, ScopeType } from '@senoom/shared';
import { Admin } from '../../domain/Admin';
import { Club } from '../../domain/Club';
import { Position } from '../../domain/Position';
import { RoleAssignment } from '../../domain/RoleAssignment';
import { Section } from '../../domain/Section';
import { Student } from '../../domain/Student';

export interface SectionRow {
  section_id: string;
  course: string;
  label: string;
  year: number;
}

export interface PositionRow {
  position_id: string;
  name: string;
  scope_type: ScopeType;
  permissions: Permission[];
}

export interface ClubRow {
  club_id: string;
  name: string;
  description: string;
}

export interface AssignmentRow {
  id: string;
  student_id: string;
  assigned_by: string;
  assigned_on: Date;
  ends_on: Date | null;
  position_id: string;
  position_name: string;
  scope_type: ScopeType;
  permissions: Permission[];
  club_id: string | null;
  club_name: string | null;
  club_description: string | null;
  section_id: string | null;
  section_course: string | null;
  section_label: string | null;
  section_year: number | null;
}

export interface StudentRow {
  user_id: string;
  name: string;
  email: string | null;
  password_hash: string;
  enrollment_no: string;
  course: string;
  section_id: string;
  section_course: string;
  section_label: string;
  section_year: number;
}

export interface AdminRow {
  user_id: string;
  name: string;
  email: string | null;
  password_hash: string;
}

export function rowToSection(row: SectionRow): Section {
  return new Section(row.section_id, row.course, row.label, row.year);
}

export function rowToPosition(row: PositionRow): Position {
  return new Position(row.position_id, row.name, row.scope_type, row.permissions);
}

/**
 * Builds a RoleAssignment from a joined row. When the assignment is being loaded as part of a
 * Club, pass that Club so the assignment points at the same instance instead of a fresh copy.
 */
export function rowToAssignment(row: AssignmentRow, club?: Club): RoleAssignment {
  const position = new Position(
    row.position_id,
    row.position_name,
    row.scope_type,
    row.permissions
  );
  const assignedClub =
    club ??
    (row.club_id ? new Club(row.club_id, row.club_name ?? '', row.club_description ?? '') : null);
  const section = row.section_id
    ? new Section(
        row.section_id,
        row.section_course ?? '',
        row.section_label ?? '',
        row.section_year ?? 0
      )
    : null;
  return new RoleAssignment(
    row.id,
    row.student_id,
    position,
    assignedClub,
    section,
    row.assigned_by,
    row.assigned_on,
    row.ends_on
  );
}

export function rowToStudent(row: StudentRow, assignments: RoleAssignment[] = []): Student {
  return new Student({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    enrollmentNo: row.enrollment_no,
    course: row.course,
    section: new Section(row.section_id, row.section_course, row.section_label, row.section_year),
    roleAssignments: assignments,
  });
}

/** The users table has no admin level column, so every admin gets the default level 1. */
export function rowToAdmin(row: AdminRow): Admin {
  return new Admin({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
  });
}

import { randomUUID } from 'node:crypto';
import type { Permission, ScopeType } from '@senoom/shared';
import type { Pool } from 'pg';
import { Admin } from '../../src/domain/Admin';
import { Club } from '../../src/domain/Club';
import { Position } from '../../src/domain/Position';
import { RoleAssignment } from '../../src/domain/RoleAssignment';
import { Section } from '../../src/domain/Section';
import { Student } from '../../src/domain/Student';
import type { PasswordCheck } from '../../src/domain/User';
import { PostgresPositionRepository } from '../../src/repositories/postgres/PostgresPositionRepository';
import { PostgresRoleAssignmentRepository } from '../../src/repositories/postgres/PostgresRoleAssignmentRepository';
import { PostgresStudentRepository } from '../../src/repositories/postgres/PostgresStudentRepository';

/** A fake hasher so tests do not pay for bcrypt. */
export const fakePasswords: PasswordCheck = {
  verify: (plain, hash) => Promise.resolve(plain === hash),
  hash: plain => Promise.resolve(`H:${plain}`),
  validate: () => null,
};

export async function insertSection(
  pool: Pool,
  course = 'IT',
  label = 'A',
  year = 2
): Promise<Section> {
  const { rows } = await pool.query<{ section_id: string }>(
    'INSERT INTO sections (course, label, year) VALUES ($1, $2, $3) RETURNING section_id',
    [course, label, year]
  );
  return new Section(rows[0].section_id, course, label, year);
}

export async function insertClub(pool: Pool, name = 'Coding Club'): Promise<Club> {
  const id = randomUUID();
  await pool.query('INSERT INTO clubs (club_id, name, description) VALUES ($1, $2, $3)', [
    id,
    name,
    '',
  ]);
  return new Club(id, name, '');
}

export async function insertPosition(
  pool: Pool,
  name: string,
  scope: ScopeType,
  permissions: Permission[] = []
): Promise<Position> {
  const position = new Position(randomUUID(), name, scope, permissions);
  await new PostgresPositionRepository(pool).add(position);
  return position;
}

export async function insertAdmin(pool: Pool, email = 'admin@example.com'): Promise<Admin> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (user_id, name, email, password_hash, user_type)
     VALUES ($1, 'Admin', $2, 'hash', 'ADMIN')`,
    [id, email]
  );
  return new Admin({ userId: id, name: 'Admin', email, passwordHash: 'hash' });
}

export function buildStudent(
  section: Section,
  enrollmentNo = 'IIT2025001',
  email: string | null = null
): Student {
  return new Student({
    userId: randomUUID(),
    name: 'Test Student',
    email,
    passwordHash: 'hash',
    enrollmentNo,
    course: section.course,
    section,
  });
}

export async function insertStudent(
  pool: Pool,
  section: Section,
  enrollmentNo = 'IIT2025001',
  email: string | null = null
): Promise<Student> {
  const student = buildStudent(section, enrollmentNo, email);
  await new PostgresStudentRepository(pool, new PostgresRoleAssignmentRepository(pool)).create(
    student
  );
  return student;
}

export function buildAssignment(
  studentId: string,
  position: Position,
  target: { club?: Club; section?: Section },
  assignedBy: string,
  endsOn: Date | null = null
): RoleAssignment {
  return new RoleAssignment(
    randomUUID(),
    studentId,
    position,
    target.club ?? null,
    target.section ?? null,
    assignedBy,
    new Date(),
    endsOn
  );
}

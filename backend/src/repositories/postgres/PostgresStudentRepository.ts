import type { Pool } from 'pg';
import { isUniqueViolation, violatedConstraint } from '../../db/errors';
import { withTransaction } from '../../db/transaction';
import { DomainError } from '../../domain/DomainError';
import { Student } from '../../domain/Student';
import type { RoleAssignmentRepository } from '../RoleAssignmentRepository';
import type { StudentRepository } from '../StudentRepository';
import { rowToStudent, type StudentRow } from './mappers';

const SELECT = `
  SELECT u.user_id, u.name, u.email, u.password_hash,
         st.enrollment_no, st.course,
         s.section_id, s.course AS section_course, s.label AS section_label, s.year AS section_year
  FROM users u
  JOIN students st ON st.user_id = u.user_id
  JOIN sections s ON s.section_id = st.section_id`;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

export class PostgresStudentRepository implements StudentRepository {
  constructor(
    private readonly pool: Pool,
    private readonly assignments: RoleAssignmentRepository
  ) {}

  async findById(userId: string): Promise<Student | null> {
    const res = await this.pool.query<StudentRow>(
      `${SELECT} WHERE u.user_id = $1 AND u.is_active`,
      [userId]
    );
    return this.withAssignments(res.rows[0]);
  }

  async findByEnrollmentNo(enrollmentNo: string): Promise<Student | null> {
    const res = await this.pool.query<StudentRow>(
      `${SELECT} WHERE st.enrollment_no = $1 AND u.is_active`,
      [Student.normaliseEnrollmentNo(enrollmentNo)]
    );
    return this.withAssignments(res.rows[0]);
  }

  /** Search results are lightweight: their roleAssignments list is empty. */
  async search(enrollmentPrefix: string, limit: number, offset: number): Promise<Student[]> {
    const pattern = `${escapeLike(Student.normaliseEnrollmentNo(enrollmentPrefix))}%`;
    const res = await this.pool.query<StudentRow>(
      `${SELECT} WHERE u.is_active AND st.enrollment_no LIKE $1
       ORDER BY st.enrollment_no LIMIT $2 OFFSET $3`,
      [pattern, limit, offset]
    );
    return res.rows.map(row => rowToStudent(row));
  }

  async existsByEnrollmentNo(enrollmentNo: string): Promise<boolean> {
    const res = await this.pool.query('SELECT 1 FROM students WHERE enrollment_no = $1', [
      Student.normaliseEnrollmentNo(enrollmentNo),
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  async create(student: Student): Promise<void> {
    try {
      await withTransaction(this.pool, async client => {
        await client.query(
          `INSERT INTO users (user_id, name, email, password_hash, user_type)
           VALUES ($1, $2, $3, $4, 'STUDENT')`,
          [student.userId, student.name, student.email, student.getPasswordHashForPersistence()]
        );
        await client.query(
          `INSERT INTO students (user_id, enrollment_no, course, section_id)
           VALUES ($1, $2, $3, $4)`,
          [student.userId, student.enrollmentNo, student.course, student.section.sectionId]
        );
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const constraint = violatedConstraint(err);
        if (constraint.includes('enrollment')) {
          throw new DomainError(
            'ENROLLMENT_EXISTS',
            'This enrollment number is already registered'
          );
        }
        if (constraint.includes('email')) {
          throw new DomainError('EMAIL_EXISTS', 'This email is already registered');
        }
      }
      throw err;
    }
  }

  async update(student: Student): Promise<void> {
    await withTransaction(this.pool, async client => {
      const res = await client.query(
        `UPDATE users SET name = $2, password_hash = $3
         WHERE user_id = $1 AND user_type = 'STUDENT'`,
        [student.userId, student.name, student.getPasswordHashForPersistence()]
      );
      if (res.rowCount === 0) {
        throw new DomainError('NOT_FOUND', 'Student not found');
      }
      // The course follows the section.
      await client.query(
        `UPDATE students
         SET section_id = $2, course = (SELECT course FROM sections WHERE section_id = $2)
         WHERE user_id = $1`,
        [student.userId, student.section.sectionId]
      );
    });
  }

  async deactivate(userId: string): Promise<void> {
    const res = await this.pool.query(
      `UPDATE users SET is_active = false WHERE user_id = $1 AND user_type = 'STUDENT'`,
      [userId]
    );
    if (res.rowCount === 0) {
      throw new DomainError('NOT_FOUND', 'Student not found');
    }
  }

  private async withAssignments(row: StudentRow | undefined): Promise<Student | null> {
    if (!row) return null;
    return rowToStudent(row, await this.assignments.findActiveByStudent(row.user_id));
  }
}

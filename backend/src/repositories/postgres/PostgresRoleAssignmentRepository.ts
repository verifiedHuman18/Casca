import type { Pool } from 'pg';
import { isUniqueViolation } from '../../db/errors';
import { DomainError } from '../../domain/DomainError';
import type { RoleAssignment } from '../../domain/RoleAssignment';
import type { RoleAssignmentRepository } from '../RoleAssignmentRepository';
import { ASSIGNMENT_SELECT } from './assignmentSql';
import { rowToAssignment, type AssignmentRow } from './mappers';

export class PostgresRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly pool: Pool) {}

  async add(assignment: RoleAssignment): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO role_assignments
           (id, student_id, position_id, club_id, section_id, assigned_by, assigned_on, ends_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assignment.id,
          assignment.studentId,
          assignment.position.positionId,
          assignment.club?.clubId ?? null,
          assignment.section?.sectionId ?? null,
          assignment.assignedBy,
          assignment.assignedOn,
          assignment.endsOn,
        ]
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DomainError(
          'DUPLICATE_ASSIGNMENT',
          'This student already holds this position for this club or section'
        );
      }
      throw err;
    }
  }

  async findById(id: string): Promise<RoleAssignment | null> {
    const res = await this.pool.query<AssignmentRow>(`${ASSIGNMENT_SELECT} WHERE ra.id = $1`, [id]);
    return res.rows[0] ? rowToAssignment(res.rows[0]) : null;
  }

  async findActiveByStudent(studentId: string, now: Date = new Date()): Promise<RoleAssignment[]> {
    const res = await this.pool.query<AssignmentRow>(
      `${ASSIGNMENT_SELECT}
       WHERE ra.student_id = $1 AND (ra.ends_on IS NULL OR ra.ends_on > $2)`,
      [studentId, now]
    );
    return res.rows.map(row => rowToAssignment(row));
  }

  async findByStudent(studentId: string, limit: number, offset: number): Promise<RoleAssignment[]> {
    const res = await this.pool.query<AssignmentRow>(
      `${ASSIGNMENT_SELECT}
       WHERE ra.student_id = $1
       ORDER BY ra.assigned_on DESC, ra.id
       LIMIT $2 OFFSET $3`,
      [studentId, limit, offset]
    );
    return res.rows.map(row => rowToAssignment(row));
  }

  async hasActiveDuplicate(
    studentId: string,
    positionId: string,
    clubId: string | null,
    sectionId: string | null
  ): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM role_assignments
       WHERE student_id = $1 AND position_id = $2
         AND club_id IS NOT DISTINCT FROM $3::uuid
         AND section_id IS NOT DISTINCT FROM $4::uuid
         AND (ends_on IS NULL OR ends_on > now())
       LIMIT 1`,
      [studentId, positionId, clubId, sectionId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async updateEndsOn(assignment: RoleAssignment): Promise<void> {
    const res = await this.pool.query('UPDATE role_assignments SET ends_on = $2 WHERE id = $1', [
      assignment.id,
      assignment.endsOn,
    ]);
    if (res.rowCount === 0) {
      throw new DomainError('NOT_FOUND', 'Role assignment not found');
    }
  }
}

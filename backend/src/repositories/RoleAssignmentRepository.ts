import type { RoleAssignment } from '../domain/RoleAssignment';

export interface RoleAssignmentRepository {
  /** Throws DomainError('DUPLICATE_ASSIGNMENT') if an identical open assignment exists. */
  add(assignment: RoleAssignment): Promise<void>;
  findById(id: string): Promise<RoleAssignment | null>;
  /** Loaded on every request, so it must be one indexed query. */
  findActiveByStudent(studentId: string, now?: Date): Promise<RoleAssignment[]>;
  /** Active and past, newest first. */
  findByStudent(studentId: string, limit: number, offset: number): Promise<RoleAssignment[]>;
  hasActiveDuplicate(
    studentId: string,
    positionId: string,
    clubId: string | null,
    sectionId: string | null
  ): Promise<boolean>;
  /** Persists endsOn after RoleAssignment.end(). */
  updateEndsOn(assignment: RoleAssignment): Promise<void>;
}

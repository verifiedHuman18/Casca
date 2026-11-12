import { DomainError } from '../../domain/DomainError';
import type { RoleAssignment } from '../../domain/RoleAssignment';
import type { RoleAssignmentRepository } from '../RoleAssignmentRepository';

function sameKey(a: RoleAssignment, b: RoleAssignment): boolean {
  return (
    a.studentId === b.studentId &&
    a.position.positionId === b.position.positionId &&
    (a.club?.clubId ?? null) === (b.club?.clubId ?? null) &&
    (a.section?.sectionId ?? null) === (b.section?.sectionId ?? null)
  );
}

export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly byId = new Map<string, RoleAssignment>();

  /** Mirrors the database: only open-ended rows are unique per (student, position, club, section). */
  add(assignment: RoleAssignment): Promise<void> {
    const clash =
      assignment.endsOn === null &&
      [...this.byId.values()].some(e => e.endsOn === null && sameKey(e, assignment));
    if (clash) {
      return Promise.reject(
        new DomainError(
          'DUPLICATE_ASSIGNMENT',
          'This student already holds this position for this club or section'
        )
      );
    }
    this.byId.set(assignment.id, assignment);
    return Promise.resolve();
  }

  findById(id: string): Promise<RoleAssignment | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }

  findActiveByStudent(studentId: string, now: Date = new Date()): Promise<RoleAssignment[]> {
    return Promise.resolve(
      [...this.byId.values()].filter(a => a.studentId === studentId && a.isActive(now))
    );
  }

  findByStudent(studentId: string, limit: number, offset: number): Promise<RoleAssignment[]> {
    const all = [...this.byId.values()]
      .filter(a => a.studentId === studentId)
      .sort((a, b) => b.assignedOn.getTime() - a.assignedOn.getTime());
    return Promise.resolve(all.slice(offset, offset + limit));
  }

  hasActiveDuplicate(
    studentId: string,
    positionId: string,
    clubId: string | null,
    sectionId: string | null
  ): Promise<boolean> {
    const now = new Date();
    return Promise.resolve(
      [...this.byId.values()].some(
        a =>
          a.studentId === studentId &&
          a.position.positionId === positionId &&
          (a.club?.clubId ?? null) === clubId &&
          (a.section?.sectionId ?? null) === sectionId &&
          a.isActive(now)
      )
    );
  }

  updateEndsOn(assignment: RoleAssignment): Promise<void> {
    if (!this.byId.has(assignment.id)) {
      return Promise.reject(new DomainError('NOT_FOUND', 'Role assignment not found'));
    }
    this.byId.set(assignment.id, assignment);
    return Promise.resolve();
  }
}

import { randomUUID } from 'node:crypto';
import type { AuthUser } from '@senoom/shared';
import { DomainError } from '../domain/DomainError';
import { RoleAssignment } from '../domain/RoleAssignment';
import type { ClubRepository } from '../repositories/ClubRepository';
import type { PositionRepository } from '../repositories/PositionRepository';
import type { RoleAssignmentRepository } from '../repositories/RoleAssignmentRepository';
import type { SectionRepository } from '../repositories/SectionRepository';
import type { StudentRepository } from '../repositories/StudentRepository';
import type { AuditLog } from './AuditLog';
import type { PermissionService } from './PermissionService';

export interface RoleDeps {
  assignments: RoleAssignmentRepository;
  students: StudentRepository;
  positions: PositionRepository;
  clubs: ClubRepository;
  sections: SectionRepository;
  permissions: PermissionService;
  audit: AuditLog;
}

export interface AssignInput {
  studentId: string;
  positionId: string;
  clubId?: string;
  sectionId?: string;
}

/** UC-11: assign and revoke positions. Rights apply from the next request, because roles are re-read. */
export class RoleService {
  constructor(
    private readonly deps: RoleDeps,
    private readonly clock: () => Date = () => new Date()
  ) {}

  /** 404 unknown student, position, club or section; 422 wrong target; 409 active duplicate. */
  async assign(actor: AuthUser, input: AssignInput): Promise<RoleAssignment> {
    const { students, positions, clubs, sections, assignments } = this.deps;

    if (!(await students.findById(input.studentId))) {
      throw new DomainError('NOT_FOUND', 'Student not found');
    }
    const position = await positions.findById(input.positionId);
    if (!position) throw new DomainError('NOT_FOUND', 'Position not found');

    const club = input.clubId ? await clubs.findById(input.clubId) : null;
    if (input.clubId && !club) throw new DomainError('NOT_FOUND', 'Club not found');
    const section = input.sectionId ? await sections.findById(input.sectionId) : null;
    if (input.sectionId && !section) {
      throw new DomainError('SECTION_NOT_FOUND', 'Section does not exist');
    }

    // The constructor rejects a target that does not match the position's scope (SCOPE_MISMATCH).
    const assignment = new RoleAssignment(
      randomUUID(),
      input.studentId,
      position,
      club,
      section,
      actor.userId,
      this.clock()
    );
    if (
      await assignments.hasActiveDuplicate(
        input.studentId,
        position.positionId,
        club?.clubId ?? null,
        section?.sectionId ?? null
      )
    ) {
      throw new DomainError(
        'DUPLICATE_ASSIGNMENT',
        'This student already holds this position for this club or section'
      );
    }
    await assignments.add(assignment); // also catches a concurrent duplicate
    this.audit(actor, 'ROLE_ASSIGNED', assignment.id);
    return assignment;
  }

  /** Sets endsOn to now. 404 unknown, 409 if it already ended. Events already created remain. */
  async revoke(actor: AuthUser, assignmentId: string): Promise<RoleAssignment> {
    const assignment = await this.deps.assignments.findById(assignmentId);
    if (!assignment) throw new DomainError('NOT_FOUND', 'Role assignment not found');
    assignment.end(this.clock()); // ALREADY_ENDED
    await this.deps.assignments.updateEndsOn(assignment);
    this.audit(actor, 'ROLE_REVOKED', assignmentId);
    return assignment;
  }

  /** Active and past, newest first. A student sees their own; MANAGE_ROLES sees anyone's. */
  async listForStudent(
    actor: AuthUser,
    studentId: string,
    limit: number,
    offset: number
  ): Promise<RoleAssignment[]> {
    const own = actor.userId === studentId;
    if (!own && !this.deps.permissions.canManageRoles(actor)) {
      throw new DomainError('FORBIDDEN', 'You are not allowed to see these assignments');
    }
    if (!own && !(await this.deps.students.findById(studentId))) {
      throw new DomainError('NOT_FOUND', 'Student not found');
    }
    return this.deps.assignments.findByStudent(studentId, limit, offset);
  }

  private audit(actor: AuthUser, action: string, targetId: string): void {
    this.deps.audit.record({ actorId: actor.userId, action, targetId });
  }
}

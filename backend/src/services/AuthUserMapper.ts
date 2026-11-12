import { AuthAssignment, AuthUser, UserType } from '@senoom/shared';
import type { Admin } from '../domain/Admin';
import type { RoleAssignment } from '../domain/RoleAssignment';
import type { Student } from '../domain/Student';

/** Flattens domain objects into the AuthUser that PermissionService and the routes read. */
export class AuthUserMapper {
  static forStudent(student: Student, assignments: RoleAssignment[], now = new Date()): AuthUser {
    const active = assignments.filter(a => a.isActive(now));
    const clubIds = new Set<string>();
    for (const a of active) {
      if (a.club) clubIds.add(a.club.clubId);
    }
    return {
      userId: student.userId,
      name: student.name,
      type: UserType.STUDENT,
      enrollmentNo: student.enrollmentNo,
      sectionId: student.section.sectionId,
      course: student.course,
      year: student.getYear(),
      assignments: active.map(AuthUserMapper.assignment),
      clubIds: [...clubIds],
    };
  }

  /** Admins are not students: student-only fields are null and their power is implicit. */
  static forAdmin(admin: Admin): AuthUser {
    return {
      userId: admin.userId,
      name: admin.name,
      type: UserType.ADMIN,
      enrollmentNo: null,
      sectionId: null,
      course: null,
      year: null,
      assignments: [],
      clubIds: [],
    };
  }

  private static assignment(a: RoleAssignment): AuthAssignment {
    return {
      assignmentId: a.id,
      positionId: a.position.positionId,
      positionName: a.position.name,
      scopeType: a.position.scopeType,
      permissions: [...a.position.permissions],
      clubId: a.club?.clubId ?? null,
      sectionId: a.section?.sectionId ?? null,
      endsOn: a.endsOn ? a.endsOn.toISOString() : null,
    };
  }
}

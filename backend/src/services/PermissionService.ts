import {
  AuthAssignment,
  AuthUser,
  EventRef,
  Permission,
  ScopeType,
  UserType,
} from '@senoom/shared';

/** What the implicit campus-scoped Admin position grants (the Admin row of the seed positions). */
const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.CREATE_CAMPUS_EVENT,
  Permission.APPROVE_CAMPUS_EVENT,
  Permission.EDIT_ANY_IN_SCOPE,
  Permission.MANAGE_ROLES,
  Permission.MANAGE_REGISTRY,
]);

/**
 * The single place where authorisation is decided.
 *
 * Pure and synchronous: it only reads the AuthUser that requireAuth loaded for this request,
 * so there is no caching and a revoked assignment stops counting on the very next request.
 * Rights are the union of all active assignments, each applying only inside its own scope.
 * An Admin account counts as holding the campus-scoped Admin position.
 */
export class PermissionService {
  /** The clock is injectable so tests can check assignments that have just ended. */
  constructor(private readonly clock: () => Date = () => new Date()) {}

  /**
   * Can `user` publish directly in this scope? `targetId` is the club or section id.
   * For an event with several target sections the caller checks each section.
   */
  canPublish(user: AuthUser, scope: ScopeType, targetId?: string): boolean {
    switch (scope) {
      case ScopeType.CAMPUS:
        return this.allows(user, Permission.CREATE_CAMPUS_EVENT, ScopeType.CAMPUS);
      case ScopeType.CLUB:
        return this.allows(user, Permission.CREATE_CLUB_EVENT, ScopeType.CLUB, targetId);
      case ScopeType.SECTION:
        return this.allows(user, Permission.CREATE_SECTION_EVENT, ScopeType.SECTION, targetId);
    }
  }

  /** True if any active assignment grants REQUEST_CAMPUS_EVENT. */
  canRequestCampusEvent(user: AuthUser): boolean {
    return this.activeAssignments(user).some(a =>
      a.permissions.includes(Permission.REQUEST_CAMPUS_EVENT)
    );
  }

  /** Admin only, and never for an event the same user created. */
  canApprove(user: AuthUser, event: EventRef): boolean {
    return (
      event.createdBy !== user.userId &&
      this.allows(user, Permission.APPROVE_CAMPUS_EVENT, ScopeType.CAMPUS)
    );
  }

  /**
   * The creator, anyone currently holding the publishing (or edit-any) permission for the
   * event's scope and target, and Admin (design document 6.4). The creator keeps the right even
   * after their position ends; that is open decision 3 and follows the document literally.
   * For a multi-section event the user needs the right for every target section.
   */
  canEdit(user: AuthUser, event: EventRef): boolean {
    if (event.createdBy === user.userId) return true;
    if (this.allows(user, Permission.EDIT_ANY_IN_SCOPE, ScopeType.CAMPUS)) return true;

    switch (event.scope) {
      case ScopeType.CAMPUS:
        return this.allows(user, Permission.CREATE_CAMPUS_EVENT, ScopeType.CAMPUS);
      case ScopeType.CLUB:
        return (
          event.clubId !== null &&
          this.canEditIn(user, ScopeType.CLUB, event.clubId, Permission.CREATE_CLUB_EVENT)
        );
      case ScopeType.SECTION:
        return (
          event.targetSectionIds.length > 0 &&
          event.targetSectionIds.every(id =>
            this.canEditIn(user, ScopeType.SECTION, id, Permission.CREATE_SECTION_EVENT)
          )
        );
    }
  }

  canManageRoles(user: AuthUser): boolean {
    return this.allows(user, Permission.MANAGE_ROLES, ScopeType.CAMPUS);
  }

  canManageRegistry(user: AuthUser): boolean {
    return this.allows(user, Permission.MANAGE_REGISTRY, ScopeType.CAMPUS);
  }

  /** Every permission the user holds somewhere, for GET /api/me so the UI can show or hide buttons. */
  listPermissions(user: AuthUser): Permission[] {
    const all = new Set<Permission>();
    if (user.type === UserType.ADMIN) ADMIN_PERMISSIONS.forEach(p => all.add(p));
    this.activeAssignments(user).forEach(a => a.permissions.forEach(p => all.add(p)));
    return [...all].sort();
  }

  private canEditIn(
    user: AuthUser,
    scope: ScopeType,
    targetId: string,
    publishPermission: Permission
  ): boolean {
    return (
      this.allows(user, publishPermission, scope, targetId) ||
      this.allows(user, Permission.EDIT_ANY_IN_SCOPE, scope, targetId)
    );
  }

  /** AuthUser carries active assignments only, but ends are re-checked here for safety. */
  private activeAssignments(user: AuthUser): AuthAssignment[] {
    const now = this.clock().getTime();
    return user.assignments.filter(a => a.endsOn === null || new Date(a.endsOn).getTime() > now);
  }

  private allows(
    user: AuthUser,
    permission: Permission,
    scope: ScopeType,
    targetId?: string
  ): boolean {
    if (
      user.type === UserType.ADMIN &&
      scope === ScopeType.CAMPUS &&
      ADMIN_PERMISSIONS.has(permission)
    ) {
      return true;
    }
    return this.activeAssignments(user).some(
      a => a.scopeType === scope && a.permissions.includes(permission) && this.covers(a, targetId)
    );
  }

  /** CLUB and SECTION assignments only cover their own club or section. */
  private covers(assignment: AuthAssignment, targetId?: string): boolean {
    switch (assignment.scopeType) {
      case ScopeType.CAMPUS:
        return true;
      case ScopeType.CLUB:
        return typeof targetId === 'string' && assignment.clubId === targetId;
      case ScopeType.SECTION:
        return typeof targetId === 'string' && assignment.sectionId === targetId;
    }
  }
}

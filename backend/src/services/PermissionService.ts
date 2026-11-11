import { AuthUser, EventRef, ScopeType, UserType } from '@senoom/shared';

/**
 * The single place where authorisation is decided.
 *
 * CONTRACT STUB (phase 1): signatures are final, bodies are placeholders that
 * allow Admins and deny everyone else. Replaced by the real scoped checks in
 * phase 5. Methods are pure and synchronous: they only read the AuthUser.
 */
export class PermissionService {
  /** Can `user` publish an event directly in this scope? `targetId` is the club or section id. */
  canPublish(user: AuthUser, _scope: ScopeType, _targetId?: string): boolean {
    return this.isAdmin(user);
  }

  /** Can `user` ask an admin to approve a CAMPUS event? */
  canRequestCampusEvent(_user: AuthUser): boolean {
    return false;
  }

  /** Can `user` approve or reject this pending request? Never for their own. */
  canApprove(user: AuthUser, event: EventRef): boolean {
    return this.isAdmin(user) && event.createdBy !== user.userId;
  }

  /** Can `user` edit, reschedule or cancel this event? */
  canEdit(user: AuthUser, event: EventRef): boolean {
    return this.isAdmin(user) || event.createdBy === user.userId;
  }

  /** Can `user` assign and revoke positions? */
  canManageRoles(user: AuthUser): boolean {
    return this.isAdmin(user);
  }

  /** Can `user` administer students, clubs and positions? */
  canManageRegistry(user: AuthUser): boolean {
    return this.isAdmin(user);
  }

  private isAdmin(user: AuthUser): boolean {
    return user.type === UserType.ADMIN;
  }
}

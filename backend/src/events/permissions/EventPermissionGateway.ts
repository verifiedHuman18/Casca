import { Event } from '../domain/Event';
import { EventActor } from '../domain/event.types';
import { EventScope } from '../domain/event.enums';

/**
 * Adapter boundary for Member A's PermissionService.
 *
 * Required semantics:
 * - canPublish checks an active publishing assignment for the exact target scope.
 * - canRequestCampusEvent checks REQUEST_CAMPUS_EVENT.
 * - canApprove checks Admin authority.
 * - canEdit checks creator OR current same-scope publishing permission OR Admin.
 * - canViewApprovalQueue checks Admin authority.
 */
export interface EventPermissionGateway {
  canPublish(actor: EventActor, scope: EventScope, targetId?: string): Promise<boolean>;
  canRequestCampusEvent(actor: EventActor): Promise<boolean>;
  canApprove(actor: EventActor, event: Event): Promise<boolean>;
  canEdit(actor: EventActor, event: Event): Promise<boolean>;
  canViewApprovalQueue(actor: EventActor): Promise<boolean>;
}

export class DenyAllEventPermissionGateway implements EventPermissionGateway {
  async canPublish(): Promise<boolean> {
    return false;
  }
  async canRequestCampusEvent(): Promise<boolean> {
    return false;
  }
  async canApprove(): Promise<boolean> {
    return false;
  }
  async canEdit(): Promise<boolean> {
    return false;
  }
  async canViewApprovalQueue(): Promise<boolean> {
    return false;
  }
}

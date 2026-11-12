import type { AuthUser, EventRef } from '@senoom/shared';
import { PermissionService } from '../../services/PermissionService';
import { ClubEvent } from '../domain/ClubEvent';
import { Event } from '../domain/Event';
import { SectionEvent } from '../domain/SectionEvent';
import { DomainError, EventActor } from '../domain/event.types';
import { EventPermissionGateway } from './EventPermissionGateway';

export class PermissionServiceEventGateway implements EventPermissionGateway {
  constructor(private readonly permissionService: PermissionService) {}

  private requireAuthUser(actor: EventActor): AuthUser {
    if (!actor.authUser) {
      throw new DomainError(
        'Trusted authentication context is missing.',
        'AUTH_CONTEXT_MISSING',
        500
      );
    }

    return actor.authUser;
  }

  private toEventRef(event: Event): EventRef {
    return {
      scope: event.scope,
      clubId: event instanceof ClubEvent ? event.clubId : null,
      targetSectionIds: event instanceof SectionEvent ? [...event.targetSectionIds] : [],
      createdBy: event.createdBy,
      status: event.status,
    };
  }

  async canPublish(
    actor: EventActor,
    scope: Parameters<PermissionService['canPublish']>[1],
    targetId?: string
  ): Promise<boolean> {
    return this.permissionService.canPublish(this.requireAuthUser(actor), scope, targetId);
  }

  async canRequestCampusEvent(actor: EventActor): Promise<boolean> {
    return this.permissionService.canRequestCampusEvent(this.requireAuthUser(actor));
  }

  async canApprove(actor: EventActor, event: Event): Promise<boolean> {
    return this.permissionService.canApprove(this.requireAuthUser(actor), this.toEventRef(event));
  }

  async canEdit(actor: EventActor, event: Event): Promise<boolean> {
    return this.permissionService.canEdit(this.requireAuthUser(actor), this.toEventRef(event));
  }

  async canViewApprovalQueue(actor: EventActor): Promise<boolean> {
    // The current design allows Admins only. PermissionService's existing
    // canManageRegistry method is also Admin-only.
    return this.permissionService.canManageRegistry(this.requireAuthUser(actor));
  }
}

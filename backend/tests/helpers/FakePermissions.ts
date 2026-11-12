import { EventPermissionGateway } from '../../src/events/permissions/EventPermissionGateway';
import { Event } from '../../src/events/domain/Event';
import { ClubEvent } from '../../src/events/domain/ClubEvent';
import { SectionEvent } from '../../src/events/domain/SectionEvent';
import { EventActor } from '../../src/events/domain/event.types';
import { EventScope } from '../../src/events/domain/event.enums';

export class FakePermissions implements EventPermissionGateway {
  async canPublish(actor: EventActor, scope: EventScope, targetId?: string) {
    if (actor.isAdmin) return true;
    if (scope === EventScope.SECTION) {
      return actor.sectionId === targetId && actor.userId === 'cr';
    }
    if (scope === EventScope.CLUB) {
      return actor.userId === 'club-officer' && targetId === 'club-1';
    }
    return false;
  }

  async canRequestCampusEvent(actor: EventActor) {
    return actor.userId === 'club-officer';
  }

  async canApprove(actor: EventActor) {
    return actor.isAdmin === true;
  }

  async canEdit(actor: EventActor, event: Event) {
    if (actor.isAdmin || actor.userId === event.createdBy) return true;

    if (event instanceof SectionEvent) {
      return actor.userId === 'cr' && actor.sectionId === event.targetSectionIds[0];
    }

    if (event instanceof ClubEvent) {
      return actor.userId === 'club-officer' && event.clubId === 'club-1';
    }

    return false;
  }

  async canViewApprovalQueue(actor: EventActor) {
    return actor.isAdmin === true;
  }
}

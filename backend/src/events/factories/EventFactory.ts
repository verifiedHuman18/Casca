import { randomUUID } from 'node:crypto';
import { CampusEvent } from '../domain/CampusEvent';
import { ClubEvent } from '../domain/ClubEvent';
import { SectionEvent } from '../domain/SectionEvent';
import { ClubVisibility, EventScope, EventStatus } from '../domain/event.enums';
import { Event, EventCreateInput, EventProps } from '../domain';

export class EventFactory {
  static create(input: EventCreateInput, createdBy: string, status = EventStatus.ACTIVE): Event {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    const now = new Date();

    const common: EventProps = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      venue: input.venue.trim(),
      startTime,
      endTime,
      createdBy,
      createdAt: now,
      status,
    };

    switch (input.scope) {
      case EventScope.CAMPUS:
        return new CampusEvent(common);
      case EventScope.CLUB:
        return new ClubEvent({
          ...common,
          clubId: input.clubId,
          clubVisibility: input.clubVisibility ?? ClubVisibility.PUBLIC,
        });
      case EventScope.SECTION:
        return new SectionEvent({
          ...common,
          targetSectionIds: input.targetSectionIds,
        });
      default:
        throw new Error(`Unsupported event scope: ${String(input.scope)}`);
    }
  }
}

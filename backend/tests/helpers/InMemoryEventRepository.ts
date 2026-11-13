import { Event } from '../../src/events/domain/Event';
import { ClubEvent } from '../../src/events/domain/ClubEvent';
import { SectionEvent } from '../../src/events/domain/SectionEvent';
import { ClubVisibility, EventScope, EventStatus } from '../../src/events/domain/event.enums';
import type { CalendarQuery, EventRepository } from '../../src/events/repositories/EventRepository';
import type { ClashWarning } from '../../src/events/domain/event.types';

export class InMemoryEventRepository implements EventRepository {
  private readonly events = new Map<string, Event>();

  async create(event: Event) {
    this.events.set(event.id, event);
    return event;
  }

  async update(event: Event) {
    this.events.set(event.id, event);
    return event;
  }

  async findById(id: string) {
    return this.events.get(id) ?? null;
  }

  async findAll() {
    return [...this.events.values()];
  }

  async findForCalendar(query: CalendarQuery): Promise<Event[]> {
    return [...this.events.values()]
      .filter(event => event.status === EventStatus.ACTIVE)
      .filter(event => event.startTime >= query.from)
      .filter(event => event.endTime <= query.to)
      .filter(event => {
        if (event.scope !== EventScope.CLUB || query.clubIds.length === 0) {
          return true;
        }

        return query.clubIds.includes((event as ClubEvent).clubId);
      })
      .filter(event => {
        if (event.scope !== EventScope.CLUB) return true;

        const clubEvent = event as ClubEvent;

        return (
          clubEvent.clubVisibility === ClubVisibility.PUBLIC ||
          query.clubMembershipIds.includes(clubEvent.clubId)
        );
      })
      .filter(event => {
        if (event.scope !== EventScope.SECTION) return true;

        return (event as SectionEvent).targetSectionIds.some(sectionId =>
          query.sectionIds.includes(sectionId)
        );
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async findPendingApproval() {
    return [...this.events.values()].filter(e => e.status === EventStatus.PENDING_APPROVAL);
  }

  async findByCreator(userId: string) {
    return [...this.events.values()].filter(e => e.createdBy === userId);
  }

  async findClashes(
    venue: string,
    start: Date,
    end: Date,
    excludeId?: string
  ): Promise<ClashWarning[]> {
    return [...this.events.values()]
      .filter(e => e.id !== excludeId && e.status !== EventStatus.CANCELLED)
      .filter(e => e.venue.trim().toLowerCase() === venue.trim().toLowerCase())
      .filter(e => e.startTime < end && e.endTime > start)
      .map(e => ({
        eventId: e.id,
        title: e.title,
        venue: e.venue,
        startTime: e.startTime,
        endTime: e.endTime,
      }));
  }
}

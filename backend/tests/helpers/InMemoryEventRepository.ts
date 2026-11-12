import { Event } from '../../src/events/domain/Event';
import { EventRepository } from '../../src/events/repositories/EventRepository';
import { ClashWarning } from '../../src/events/domain/event.types';

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
  async findPendingApproval() {
    return [...this.events.values()].filter(e => e.status === 'PENDING_APPROVAL');
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
      .filter(e => e.id !== excludeId && e.status !== 'CANCELLED')
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

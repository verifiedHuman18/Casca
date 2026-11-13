import { Event } from '../domain/Event';
import { ClashWarning } from '../domain/event.types';

export interface CalendarQuery {
  from: Date;
  to: Date;
  clubIds: string[];
  clubMembershipIds: string[];
  sectionIds: string[];
}

export interface EventRepository {
  create(event: Event): Promise<Event>;
  update(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findAll(): Promise<Event[]>;
  /** Returns visible calendar candidates ordered by start time. */
  findForCalendar(query: CalendarQuery): Promise<Event[]>;
  findPendingApproval(): Promise<Event[]>;
  findByCreator(userId: string): Promise<Event[]>;
  findClashes(
    venue: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<ClashWarning[]>;
}

import type { EventActor, CalendarFilterInput } from '../domain/event.types';
import { DomainError } from '../../domain/DomainError';
import { CalendarFilter } from '../filters/CalendarFilter';
import { Event } from '../domain/Event';
import { EventRepository } from '../repositories/EventRepository';

export class CalendarService {
  constructor(private readonly repository: EventRepository) {}

  async getCalendar(student: EventActor, filterInput: CalendarFilterInput = {}): Promise<Event[]> {
    // Keep explicitly selected sections separate for domain visibility checks.
    const extraSections = [...new Set(filterInput.sectionIds ?? [])];

    // Always include the student's own section.
    const filter = new CalendarFilter({
      ...filterInput,
      sectionIds: [
        ...new Set([...(student.sectionId ? [student.sectionId] : []), ...extraSections]),
      ],
    });

    const from = filter.from;
    const to = filter.to;

    if (!from || !to) {
      throw new DomainError(
        'INVALID_DATE_RANGE',
        'Both from and to dates are required for calendar queries.'
      );
    }

    // PostgreSQL (or the in-memory test repository) applies the filters.
    const events = await this.repository.findForCalendar({
      from,
      to,
      clubIds: filter.clubIds,
      clubMembershipIds: student.clubMembershipIds ?? [],
      sectionIds: filter.sectionIds,
    });

    // Keep domain visibility as a final safety check.
    return events.filter(event =>
      event.isVisibleTo({
        viewer: student,
        extraSectionIds: extraSections,
      })
    );
  }
}

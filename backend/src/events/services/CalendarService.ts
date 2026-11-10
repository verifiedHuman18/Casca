import { EventRepository } from '../repositories/EventRepository';
import { EventActor, CalendarFilterInput } from '../domain/event.types';
import { EventStatus } from '../domain/event.enums';
import { CalendarFilter } from '../filters/CalendarFilter';
import { Event } from '../domain/Event';

export class CalendarService {
  constructor(private readonly repository: EventRepository) {}

  async getCalendar(student: EventActor, filterInput: CalendarFilterInput = {}): Promise<Event[]> {
    // Sections explicitly selected by the student.
    const extraSections = [...new Set(filterInput.sectionIds ?? [])];

    // Always include the student's own section.
    const filter = new CalendarFilter({
      ...filterInput,
      sectionIds: [
        ...new Set([...(student.sectionId ? [student.sectionId] : []), ...extraSections]),
      ],
    });

    // Retrieve all events from the repository.
    const allEvents = await this.repository.findAll();

    return (
      allEvents
        // Only active events appear on student calendars.
        .filter(event => event.status === EventStatus.ACTIVE)

        // Apply date, club and section filters.
        .filter(event => filter.matches(event))

        // Apply event-specific visibility rules.
        .filter(event =>
          event.isVisibleTo({
            viewer: student,
            extraSectionIds: extraSections,
          })
        )

        // Sort events chronologically.
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    );
  }
}

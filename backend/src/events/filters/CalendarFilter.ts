import { Event } from '../domain/Event';
import { ClubEvent } from '../domain/ClubEvent';
import { SectionEvent } from '../domain/SectionEvent';

import { EventScope, EventStatus } from '../domain/event.enums';

import { DomainError } from '../../domain/DomainError';
import type { CalendarFilterInput } from '../domain/event.types';

function validDate(value: string | Date | undefined, name: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DomainError('INVALID_DATE', `${name} must be a valid date.`);
  }

  return date;
}

export class CalendarFilter {
  readonly from?: Date;
  readonly to?: Date;

  readonly clubIds: string[];
  readonly sectionIds: string[];

  readonly includeCancelled: boolean;

  constructor(input: CalendarFilterInput = {}) {
    this.from = validDate(input.from, 'from');

    this.to = validDate(input.to, 'to');

    // Validate the requested date range.
    if (this.from && this.to && this.to < this.from) {
      throw new DomainError(
        'INVALID_DATE_RANGE',
        'Calendar end date must be on or after start date.'
      );
    }

    this.clubIds = input.clubIds ?? [];

    this.sectionIds = input.sectionIds ?? [];

    this.includeCancelled = input.includeCancelled ?? false;
  }

  matches(event: Event): boolean {
    // Cancelled events are hidden by default.
    if (!this.includeCancelled && event.status === EventStatus.CANCELLED) {
      return false;
    }

    // Filter events by date range.
    // Only events fully contained in the selected range are included.

    if (this.from && event.startTime < this.from) {
      return false;
    }

    if (this.to && event.endTime > this.to) {
      return false;
    }

    // Apply club filtering.
    // Campus and section events remain visible.
    if (this.clubIds.length > 0 && event.scope === EventScope.CLUB) {
      const clubEvent = event as ClubEvent;

      if (!this.clubIds.includes(clubEvent.clubId)) {
        return false;
      }
    }

    // Apply section filtering.
    if (this.sectionIds.length > 0 && event.scope === EventScope.SECTION) {
      const sectionEvent = event as SectionEvent;

      const matchesSection = sectionEvent.targetSectionIds.some(sectionId =>
        this.sectionIds.includes(sectionId)
      );

      if (!matchesSection) {
        return false;
      }
    }

    return true;
  }
}

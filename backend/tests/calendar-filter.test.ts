import { describe, expect, it } from 'vitest';
import { CalendarFilter } from '../src/events/filters/CalendarFilter';
import type { EventCreateInput } from '../src/events/domain/event.types';
import { EventFactory } from '../src/events/factories/EventFactory';
import { EventScope } from '../src/events/domain/event.enums';

const base: Omit<EventCreateInput, 'scope'> = {
  title: 'Test Event',
  description: 'Test description',
  venue: 'Room 1',
  startTime: '2026-11-10T10:00:00Z',
  endTime: '2026-11-10T11:00:00Z',
};

function makeEvent(scope: EventScope, extra: Partial<Omit<EventCreateInput, 'scope'>> = {}) {
  return EventFactory.create({ ...base, ...extra, scope }, 'test-user');
}

describe('CalendarFilter', () => {
  it('accepts valid string and Date values', () => {
    const filter = new CalendarFilter({
      from: '2026-11-10T09:00:00Z',
      to: new Date('2026-11-10T12:00:00Z'),
    });

    expect(filter.from).toBeInstanceOf(Date);
    expect(filter.to).toBeInstanceOf(Date);
  });

  it('rejects an invalid from date', () => {
    expect(() => new CalendarFilter({ from: 'invalid-date' })).toThrow(
      expect.objectContaining({
        code: 'INVALID_DATE',
      })
    );
  });

  it('rejects an invalid to date', () => {
    expect(() => new CalendarFilter({ to: 'invalid-date' })).toThrow(
      expect.objectContaining({
        code: 'INVALID_DATE',
      })
    );
  });

  it('rejects a date range where to is before from', () => {
    expect(
      () =>
        new CalendarFilter({
          from: '2026-11-10T12:00:00Z',
          to: '2026-11-10T09:00:00Z',
        })
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_DATE_RANGE',
      })
    );
  });

  it('includes events that overlap the requested time range', () => {
    const filter = new CalendarFilter({
      from: '2026-11-10T10:00:00Z',
      to: '2026-11-10T11:00:00Z',
    });

    const overlapping = makeEvent(EventScope.CAMPUS, {
      startTime: '2026-11-10T09:30:00Z',
      endTime: '2026-11-10T10:30:00Z',
    });

    const outside = makeEvent(EventScope.CAMPUS, {
      startTime: '2026-11-10T11:01:00Z',
      endTime: '2026-11-10T12:00:00Z',
    });

    expect(filter.matches(overlapping)).toBe(true);
    expect(filter.matches(outside)).toBe(false);
  });

  it('excludes cancelled events by default', () => {
    const event = makeEvent(EventScope.CAMPUS);
    event.cancel();

    expect(new CalendarFilter().matches(event)).toBe(false);
    expect(new CalendarFilter({ includeCancelled: true }).matches(event)).toBe(true);
  });

  it('filters club events by club ID without hiding other scopes', () => {
    const filter = new CalendarFilter({ clubIds: ['club-1'] });

    const matchingClub = makeEvent(EventScope.CLUB, {
      clubId: 'club-1',
    });

    const otherClub = makeEvent(EventScope.CLUB, {
      clubId: 'club-2',
    });

    const campusEvent = makeEvent(EventScope.CAMPUS);

    expect(filter.matches(matchingClub)).toBe(true);
    expect(filter.matches(otherClub)).toBe(false);
    expect(filter.matches(campusEvent)).toBe(true);
  });

  it('filters section events by matching target section IDs', () => {
    const filter = new CalendarFilter({ sectionIds: ['section-1'] });

    const matchingSection = makeEvent(EventScope.SECTION, {
      targetSectionIds: ['section-1', 'section-2'],
    });

    const otherSection = makeEvent(EventScope.SECTION, {
      targetSectionIds: ['section-3'],
    });

    const campusEvent = makeEvent(EventScope.CAMPUS);

    expect(filter.matches(matchingSection)).toBe(true);
    expect(filter.matches(otherSection)).toBe(false);
    expect(filter.matches(campusEvent)).toBe(true);
  });
});

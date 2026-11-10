import { describe, expect, it } from 'vitest';
import { ClubEvent } from '../src/events/domain/ClubEvent';
import { EventFactory } from '../src/events/factories/EventFactory';
import { EventScope, EventStatus, ClubVisibility } from '../src/events/domain/event.enums';

describe('Event domain and factory', () => {
  const common = {
    title: 'Meeting',
    description: 'Description',
    venue: 'Room 1',
    startTime: '2026-11-10T10:00:00Z',
    endTime: '2026-11-10T11:00:00Z',
  };
  it('constructs each concrete event type', () => {
    expect(EventFactory.create({ ...common, scope: EventScope.CAMPUS }, 'admin')).toHaveProperty(
      'scope',
      'CAMPUS'
    );
    expect(
      EventFactory.create({ ...common, scope: EventScope.CLUB, clubId: 'c1' }, 'u')
    ).toHaveProperty('scope', 'CLUB');
    expect(
      EventFactory.create({ ...common, scope: EventScope.SECTION, targetSectionIds: ['s1'] }, 'u')
    ).toHaveProperty('scope', 'SECTION');
  });
  it('creates campus requests as pending', () => {
    const event = EventFactory.create(
      { ...common, scope: EventScope.CAMPUS },
      'u',
      EventStatus.PENDING_APPROVAL
    );
    expect(event.status).toBe(EventStatus.PENDING_APPROVAL);
  });
  it('defaults club visibility to public', () => {
    const event = EventFactory.create({ ...common, scope: EventScope.CLUB, clubId: 'c1' }, 'u');
    expect(event).toBeInstanceOf(ClubEvent);
    if (event instanceof ClubEvent) {
      expect(event.clubVisibility).toBe(ClubVisibility.PUBLIC);
    }
  });
});

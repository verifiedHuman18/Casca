import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventService } from '../src/events/services/EventService';
import { CalendarService } from '../src/events/services/CalendarService';

import { InMemoryEventRepository } from './helpers/InMemoryEventRepository';
import { FakePermissions } from './helpers/FakePermissions';

import { ClubVisibility, EventScope, EventStatus } from '../src/events/domain/event.enums';

describe('Member B event and calendar services', () => {
  let repo: InMemoryEventRepository;
  let permissions: FakePermissions;
  let service: EventService;

  const cr = {
    userId: 'cr',
    sectionId: 'IT-A',
  };

  const clubOfficer = {
    userId: 'club-officer',
    sectionId: 'IT-A',
  };

  const admin = {
    userId: 'admin',
    isAdmin: true,
  };

  const base = (overrides: Record<string, unknown> = {}) => ({
    title: 'Tech Talk',
    description: 'A campus talk',
    venue: 'Auditorium',
    startTime: '2026-12-01T10:00:00+05:30',
    endTime: '2026-12-01T11:00:00+05:30',
    ...overrides,
  });

  beforeEach(() => {
    repo = new InMemoryEventRepository();
    permissions = new FakePermissions();
    service = new EventService(repo, permissions);
  });

  const calendarWindow = {
    from: '2026-11-01T00:00:00Z',
    to: '2027-01-01T00:00:00Z',
  };

  const getCalendar = (
    student: Parameters<CalendarService['getCalendar']>[0],
    filters: Parameters<CalendarService['getCalendar']>[1] = {}
  ) =>
    new CalendarService(repo).getCalendar(student, {
      ...calendarWindow,
      ...filters,
    });

  it('rejects calendar queries without both date bounds', async () => {
    await expect(new CalendarService(repo).getCalendar(cr)).rejects.toMatchObject({
      code: 'INVALID_DATE_RANGE',
    });
  });

  // Scenario 1: CR creates an event for their own section.
  it('scenario 1: CR creates own section event and own section sees it', async () => {
    const { event } = await service.createEvent(cr, {
      ...base(),
      scope: EventScope.SECTION,
    });

    expect((await getCalendar(cr)).map(e => e.id)).toContain(event.id);
  });

  // Scenario 3: CR cannot create an event for another section.
  it('scenario 3: CR cannot target another section', async () => {
    await expect(
      service.createEvent(cr, {
        ...base(),
        scope: EventScope.SECTION,
        targetSectionIds: ['IT-B'],
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  // Scenario 7: Cancelled event remains in the database.
  it('scenario 7: cancellation keeps record but hides it from calendar', async () => {
    const { event } = await service.createEvent(cr, {
      ...base(),
      scope: EventScope.SECTION,
    });

    await service.cancelEvent(cr, event.id);

    expect(await repo.findById(event.id)).not.toBeNull();

    expect(await getCalendar(cr)).toHaveLength(0);
  });

  // Scenario 8: Members-only visibility.
  it('scenario 8: members-only club event is visible only to club members', async () => {
    const { event } = await service.createEvent(clubOfficer, {
      ...base(),
      scope: EventScope.CLUB,
      clubId: 'club-1',
      clubVisibility: ClubVisibility.MEMBERS_ONLY,
    });

    expect(
      (
        await getCalendar({
          ...cr,
          clubMembershipIds: ['club-1'],
        })
      ).some(e => e.id === event.id)
    ).toBe(true);

    expect(
      (
        await getCalendar({
          ...cr,
          clubMembershipIds: [],
        })
      ).some(e => e.id === event.id)
    ).toBe(false);
  });

  // Scenario 9: Public club event visibility.
  it('scenario 9: public club event is visible to all students', async () => {
    const { event } = await service.createEvent(clubOfficer, {
      ...base(),
      scope: EventScope.CLUB,
      clubId: 'club-1',
      clubVisibility: ClubVisibility.PUBLIC,
    });

    expect(
      (
        await getCalendar({
          userId: 'random-student',
        })
      ).some(e => e.id === event.id)
    ).toBe(true);
  });

  // Scenario 11: Events of another section are hidden by default.
  it('scenario 11: section events are not visible to another section by default', async () => {
    const { event } = await service.createEvent(cr, {
      ...base(),
      scope: EventScope.SECTION,
    });

    expect(
      (
        await getCalendar({
          userId: 'other',
          sectionId: 'IT-B',
        })
      ).some(e => e.id === event.id)
    ).toBe(false);

    // Adding IT-A to the extra section selection makes it visible.
    expect(
      (
        await getCalendar(
          {
            userId: 'other',
            sectionId: 'IT-B',
          },
          {
            sectionIds: ['IT-A'],
          }
        )
      ).some(e => e.id === event.id)
    ).toBe(true);
  });

  // Scenario 12: Pending campus request is hidden until approved.
  it('scenario 12: pending campus request is hidden; approval publishes it', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    expect(event.status).toBe(EventStatus.PENDING_APPROVAL);

    expect(
      await getCalendar({
        userId: 'student',
      })
    ).toHaveLength(0);

    await service.approveEvent(admin, event.id);

    expect(
      (
        await getCalendar({
          userId: 'student',
        })
      ).some(e => e.id === event.id)
    ).toBe(true);
  });

  // Scenario 13: Rejected event remains hidden and stores its reason.
  it('scenario 13: rejected request keeps reason and stays hidden', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    const rejected = await service.rejectEvent(admin, event.id, 'Venue not approved');

    expect(rejected.status).toBe(EventStatus.REJECTED);

    expect(rejected.decisionNote).toBe('Venue not approved');

    expect(
      await getCalendar({
        userId: 'student',
      })
    ).toHaveLength(0);
  });

  // Scenario 14: Requester cannot approve their own request.
  it('scenario 14: requester cannot self-approve and cannot directly publish campus event', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    await expect(service.approveEvent(clubOfficer, event.id)).rejects.toMatchObject({
      code: 'SELF_APPROVAL',
    });

    await expect(
      service.createEvent(clubOfficer, {
        ...base(),
        scope: EventScope.CAMPUS,
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  // Rejected request can be resubmitted by the original requester.
  it('allows rejected request to be resubmitted by its original requester', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    await service.rejectEvent(admin, event.id, 'Please change the venue.');

    const result = await service.resubmitRejectedRequest(clubOfficer, event.id, {
      venue: 'New Hall',
    });

    expect(result.event.status).toBe(EventStatus.PENDING_APPROVAL);

    expect(result.event.venue).toBe('New Hall');

    expect(result.event.decisionNote).toBeNull();
  });

  // Venue clash produces a warning without blocking creation.
  it('clash detection is a warning and does not block creation', async () => {
    await service.createEvent(cr, {
      ...base(),
      scope: EventScope.SECTION,
    });

    const result = await service.createEvent(cr, {
      ...base({
        title: 'Overlapping event',
        startTime: '2026-12-01T10:30:00+05:30',
      }),
      scope: EventScope.SECTION,
    });

    expect(result.clashWarnings).toHaveLength(1);
  });

  // Event end time must be after start time.
  it('rejects invalid time ranges', async () => {
    await expect(
      service.createEvent(cr, {
        ...base({
          endTime: '2026-12-01T09:00:00+05:30',
        }),
        scope: EventScope.SECTION,
      })
    ).rejects.toMatchObject({
      code: 'INVALID_TIME_RANGE',
    });
  });

  // Admin can directly publish campus events.
  it('Admin can create a campus event directly', async () => {
    const { event } = await service.createEvent(admin, {
      ...base(),
      scope: EventScope.CAMPUS,
    });

    expect(event.status).toBe(EventStatus.ACTIVE);
  });

  // Requester can see their own requests.
  it('requester can see their own pending request in My requests', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    expect((await service.getMyRequests(clubOfficer)).map(e => e.id)).toContain(event.id);
  });

  // NEW TEST: Permission revocation prevents resubmission.
  it('denies resubmission when requester loses permission', async () => {
    const { event } = await service.requestCampusEvent(clubOfficer, base());

    await service.rejectEvent(admin, event.id, 'Please change the venue.');

    // Simulate revocation of the requester's permission.
    vi.spyOn(permissions, 'canRequestCampusEvent').mockResolvedValue(false);

    await expect(
      service.resubmitRejectedRequest(clubOfficer, event.id, {
        venue: 'New Hall',
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

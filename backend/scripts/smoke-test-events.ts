import 'dotenv/config';

import { Pool } from 'pg';

import { PgEventRepository } from '../src/events/repositories/PgEventRepository';
import { EventService } from '../src/events/services/EventService';
import { CalendarService } from '../src/events/services/CalendarService';
import { EventPermissionGateway } from '../src/events/permissions/EventPermissionGateway';
import { EventActor } from '../src/events/domain/event.types';
import { EventScope, EventStatus } from '../src/events/domain/event.enums';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });

  let eventId: string | null = null;

  const actor: EventActor = {
    userId: 'member-b-smoke-test',
    sectionId: 'test-section',
  };

  // Temporary permission adapter for local integration testing.
  // This is NOT the production PermissionService.
  const permissions: EventPermissionGateway = {
    async canPublish(user, scope, targetId) {
      return (
        user.userId === actor.userId && scope === EventScope.SECTION && targetId === actor.sectionId
      );
    },

    async canRequestCampusEvent() {
      return false;
    },

    async canApprove() {
      return false;
    },

    async canEdit(user, event) {
      return user.userId === event.createdBy || user.isAdmin === true;
    },

    async canViewApprovalQueue() {
      return false;
    },
  };

  const repository = new PgEventRepository(pool);
  const eventService = new EventService(repository, permissions);
  const calendarService = new CalendarService(repository);

  try {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const uniqueVenue = `DB-Test-${Date.now()}`;

    // 1. CREATE
    const created = await eventService.createEvent(actor, {
      scope: EventScope.SECTION,
      title: 'Database Integration Test',
      description: 'Temporary event for testing',
      venue: uniqueVenue,
      startTime: start,
      endTime: end,
    });

    eventId = created.event.id;
    console.info('PASS: Event created:', eventId);

    // 2. READ
    const fetched = await repository.findById(eventId);

    if (!fetched || fetched.title !== 'Database Integration Test') {
      throw new Error('Event retrieval failed.');
    }

    console.info('PASS: Event retrieved from PostgreSQL.');

    // 3. CALENDAR VISIBILITY
    const calendar = await calendarService.getCalendar(actor);

    if (!calendar.some(event => event.id === eventId)) {
      throw new Error("Event missing from student's calendar.");
    }

    console.info('PASS: Event appears on the calendar.');

    // 4. UPDATE
    await eventService.updateEvent(actor, eventId, {
      title: 'Updated Database Event',
      venue: uniqueVenue + '-Updated',
    });

    const updated = await repository.findById(eventId);

    if (updated?.title !== 'Updated Database Event') {
      throw new Error('Event update failed.');
    }

    console.info('PASS: Event updated.');

    // 5. RESCHEDULE
    const newStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

    await eventService.rescheduleEvent(actor, eventId, newStart, newEnd);

    const rescheduled = await repository.findById(eventId);

    if (!rescheduled || rescheduled.startTime.getTime() !== newStart.getTime()) {
      throw new Error('Event rescheduling failed.');
    }

    console.info('PASS: Event rescheduled.');

    // 6. CANCEL
    await eventService.cancelEvent(actor, eventId);

    const cancelled = await repository.findById(eventId);

    if (!cancelled || cancelled.status !== EventStatus.CANCELLED) {
      throw new Error('Event cancellation failed.');
    }

    console.info('PASS: Event cancelled but record preserved.');

    // 7. Verify cancelled event is hidden.
    const finalCalendar = await calendarService.getCalendar(actor);

    if (finalCalendar.some(event => event.id === eventId)) {
      throw new Error('Cancelled event should not appear on calendar.');
    }

    console.info('PASS: Cancelled event hidden from calendar.');

    console.info('\nALL DATABASE INTEGRATION CHECKS PASSED.');
  } finally {
    // Remove only the temporary test event.
    if (eventId) {
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      console.info('Temporary test event cleaned up.');
    }

    await pool.end();
  }
}

main().catch(error => {
  console.error('DATABASE INTEGRATION TEST FAILED:');
  console.error(error);
  process.exitCode = 1;
});

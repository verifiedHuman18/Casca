import { Router } from 'express';
import { Pool } from 'pg';
import { EventController } from '../controllers/EventController';
import { CalendarController } from '../controllers/CalendarController';
import { EventPermissionGateway } from '../permissions/EventPermissionGateway';
import { PgEventRepository } from '../repositories/PgEventRepository';
import { EventService } from '../services/EventService';
import { CalendarService } from '../services/CalendarService';
import { eventErrorHandler } from '../http/event.http';
import { RequestHandler } from 'express';

export function createEventRouter(
  pool: Pool,
  permissions: EventPermissionGateway,
  authenticationMiddleware: RequestHandler
): Router {
  const router = Router();
  const repository = new PgEventRepository(pool);
  const eventService = new EventService(repository, permissions);
  const calendarService = new CalendarService(repository);
  const events = new EventController(eventService);
  const calendar = new CalendarController(calendarService);

  router.use(authenticationMiddleware);
  // Validate event IDs before they reach PostgreSQL.
  router.param('eventId', (req, res, next, id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      res.status(400).json({
        error: {
          code: 'INVALID_EVENT_ID',
          message: 'Event ID must be a valid UUID.',
        },
      });
      return;
    }

    next();
  });
  router.post('/events', events.create);
  router.post('/events/campus-requests', events.requestCampus);
  router.get('/events/my-requests', events.myRequests);
  router.get('/events/approval-queue', events.approvalQueue);
  router.post('/events/:eventId/approve', events.approve);
  router.post('/events/:eventId/reject', events.reject);
  router.post('/events/:eventId/resubmit', events.resubmit);
  router.patch('/events/:eventId', events.update);
  router.post('/events/:eventId/reschedule', events.reschedule);
  router.post('/events/:eventId/cancel', events.cancel);
  router.get('/calendar', calendar.getCalendar);

  router.use(eventErrorHandler);
  return router;
}

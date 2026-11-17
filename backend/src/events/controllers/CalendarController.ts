import { Response } from 'express';
import { CalendarService } from '../services/CalendarService';
import { asyncHandler, requireActor, AuthenticatedRequest } from '../http/event.http';

function listParam(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  return [];
}

export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  getCalendar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const events = await this.service.getCalendar(requireActor(req), {
      from: typeof req.query.from === 'string' ? req.query.from : defaultFrom,
      to: typeof req.query.to === 'string' ? req.query.to : defaultTo,
      clubIds: listParam(req.query.clubIds),
      sectionIds: listParam(req.query.sectionIds),
    });
    res.json({ events });
  });
}

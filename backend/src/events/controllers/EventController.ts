import { Response } from 'express';
import { EventService } from '../services/EventService';
import { asyncHandler, eventIdOf, requireActor, AuthenticatedRequest } from '../http/event.http';
export class EventController {
  constructor(private readonly service: EventService) {}

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.service.createEvent(requireActor(req), req.body);
    res.status(201).json(result);
  });

  requestCampus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.service.requestCampusEvent(requireActor(req), req.body);
    res.status(201).json(result);
  });

  myRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ events: await this.service.getMyRequests(requireActor(req)) });
  });

  approvalQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ events: await this.service.getApprovalQueue(requireActor(req)) });
  });

  approve = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ event: await this.service.approveEvent(requireActor(req), req.params.eventId) });
  });

  reject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      event: await this.service.rejectEvent(requireActor(req), req.params.eventId, req.body.reason),
    });
  });

  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(await this.service.updateEvent(requireActor(req), req.params.eventId, req.body));
  });

  reschedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(
      await this.service.rescheduleEvent(
        requireActor(req),
        req.params.eventId,
        req.body.startTime,
        req.body.endTime
      )
    );
  });

  cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ event: await this.service.cancelEvent(requireActor(req), req.params.eventId) });
  });

  resubmit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(
      await this.service.resubmitRejectedRequest(requireActor(req), req.params.eventId, req.body)
    );
  });
}

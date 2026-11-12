import { Event } from '../domain/Event';
import { ClubEvent } from '../domain/ClubEvent';
import { EventFactory } from '../factories/EventFactory';
import { EventRepository } from '../repositories/EventRepository';
import { EventPermissionGateway } from '../permissions/EventPermissionGateway';
import { ClubVisibility, EventScope, EventStatus } from '../domain/event.enums';
import {
  DomainError,
  EventActor,
  EventCreateInput,
  EventMutationResult,
  EventUpdateInput,
} from '../domain/event.types';

/**
 * Parse an incoming date-time. API date strings must include an explicit
 * timezone (for example Z or +05:30) so the same instant is stored everywhere.
 */
function parseDate(value: string | Date, field: string): Date {
  if (typeof value === 'string' && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new DomainError(
      `${field} must include a timezone (for example Z or +05:30).`,
      'INVALID_DATE'
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DomainError(`${field} must be a valid ISO date-time.`, 'INVALID_DATE');
  }

  return date;
}

/** Validate required create-event fields and the time range. */
function validateInput(input: EventCreateInput): void {
  if (!input.title?.trim()) {
    throw new DomainError('Title is required.', 'VALIDATION_ERROR');
  }

  if (!input.venue?.trim()) {
    throw new DomainError('Venue is required.', 'VALIDATION_ERROR');
  }

  if (input.description == null) {
    throw new DomainError('Description is required.', 'VALIDATION_ERROR');
  }

  const start = parseDate(input.startTime, 'startTime');
  const end = parseDate(input.endTime, 'endTime');

  if (end <= start) {
    throw new DomainError('Event end must be after event start.', 'INVALID_TIME_RANGE');
  }
}

export class EventService {
  constructor(
    private readonly repository: EventRepository,
    private readonly permissions: EventPermissionGateway
  ) {}

  /** Return non-blocking venue/time clash warnings with an event result. */
  private async withClashes(event: Event): Promise<EventMutationResult<Event>> {
    const clashWarnings = await this.repository.findClashes(
      event.venue,
      event.startTime,
      event.endTime,
      event.id
    );

    return { event, clashWarnings };
  }

  /** Create an active CAMPUS, CLUB, or SECTION event when authorized. */
  async createEvent(
    actor: EventActor,
    input: EventCreateInput
  ): Promise<EventMutationResult<Event>> {
    validateInput(input);

    let targetId: string | undefined;

    if (input.scope === EventScope.CLUB) {
      if (!input.clubId) {
        throw new DomainError('clubId is required for a club event.', 'VALIDATION_ERROR');
      }

      targetId = input.clubId;

      if (!(await this.permissions.canPublish(actor, EventScope.CLUB, targetId))) {
        throw new DomainError('You cannot publish events for this club.', 'FORBIDDEN', 403);
      }

      if (
        input.clubVisibility !== undefined &&
        !Object.values(ClubVisibility).includes(input.clubVisibility)
      ) {
        throw new DomainError('Invalid club visibility.', 'VALIDATION_ERROR');
      }

      input = {
        ...input,
        clubVisibility: input.clubVisibility ?? ClubVisibility.PUBLIC,
      };
    } else if (input.scope === EventScope.SECTION) {
      if (!actor.sectionId) {
        throw new DomainError('Your account has no section.', 'FORBIDDEN', 403);
      }

      // A CR may only target their own section. The target is then derived
      // from the authenticated actor, not trusted from the request body.
      if (input.targetSectionIds?.some(id => id !== actor.sectionId)) {
        throw new DomainError(
          'A CR can create events only for their own section.',
          'FORBIDDEN',
          403
        );
      }

      targetId = actor.sectionId;

      if (!(await this.permissions.canPublish(actor, EventScope.SECTION, targetId))) {
        throw new DomainError('You cannot publish events for this section.', 'FORBIDDEN', 403);
      }

      input = {
        ...input,
        targetSectionIds: [actor.sectionId],
      };
    } else if (input.scope === EventScope.CAMPUS) {
      // Direct campus publishing is reserved for Admins. Club office
      // bearers must use requestCampusEvent instead.
      if (!(await this.permissions.canPublish(actor, EventScope.CAMPUS))) {
        throw new DomainError(
          'Only an Admin can publish a campus event directly. Submit a request instead.',
          'FORBIDDEN',
          403
        );
      }
    } else {
      throw new DomainError('Unsupported event scope.', 'VALIDATION_ERROR');
    }

    const event = EventFactory.create(input, actor.userId, EventStatus.ACTIVE);
    await this.repository.create(event);

    return this.withClashes(event);
  }

  /** Submit a CAMPUS event request for Admin approval. */
  async requestCampusEvent(
    actor: EventActor,
    input: Omit<EventCreateInput, 'scope'>
  ): Promise<EventMutationResult<Event>> {
    const complete: EventCreateInput = {
      ...input,
      scope: EventScope.CAMPUS,
    };

    validateInput(complete);

    if (!(await this.permissions.canRequestCampusEvent(actor))) {
      throw new DomainError(
        'You do not have permission to request a campus event.',
        'FORBIDDEN',
        403
      );
    }

    const event = EventFactory.create(complete, actor.userId, EventStatus.PENDING_APPROVAL);

    await this.repository.create(event);
    return this.withClashes(event);
  }

  /** Edit an existing event when the actor currently has edit rights. */
  async updateEvent(
    actor: EventActor,
    eventId: string,
    patch: EventUpdateInput
  ): Promise<EventMutationResult<Event>> {
    const event = await this.requireEvent(eventId);

    if (!(await this.permissions.canEdit(actor, event))) {
      throw new DomainError('You are not allowed to edit this event.', 'FORBIDDEN', 403);
    }

    if (event.status === EventStatus.CANCELLED || event.status === EventStatus.PENDING_APPROVAL) {
      throw new DomainError(
        'This event cannot be edited in its current status.',
        'INVALID_EVENT_STATE',
        409
      );
    }

    if (patch.title !== undefined) {
      if (!patch.title.trim()) {
        throw new DomainError('Title is required.', 'VALIDATION_ERROR');
      }
      event.title = patch.title.trim();
    }

    if (patch.description !== undefined) {
      event.description = patch.description.trim();
    }

    if (patch.venue !== undefined) {
      if (!patch.venue.trim()) {
        throw new DomainError('Venue is required.', 'VALIDATION_ERROR');
      }
      event.venue = patch.venue.trim();
    }

    if (patch.clubVisibility !== undefined) {
      if (!Object.values(ClubVisibility).includes(patch.clubVisibility)) {
        throw new DomainError('Invalid club visibility.', 'VALIDATION_ERROR');
      }

      if (!(event instanceof ClubEvent)) {
        throw new DomainError(
          'Visibility can only be changed for club events.',
          'VALIDATION_ERROR'
        );
      }

      event.clubVisibility = patch.clubVisibility;
    }

    if (patch.startTime !== undefined || patch.endTime !== undefined) {
      const start =
        patch.startTime !== undefined ? parseDate(patch.startTime, 'startTime') : event.startTime;
      const end = patch.endTime !== undefined ? parseDate(patch.endTime, 'endTime') : event.endTime;

      event.reschedule(start, end);
    }

    await this.repository.update(event);
    return this.withClashes(event);
  }

  /** Reschedule an event while retaining all other event details. */
  async rescheduleEvent(
    actor: EventActor,
    eventId: string,
    startTime: string | Date,
    endTime: string | Date
  ): Promise<EventMutationResult<Event>> {
    return this.updateEvent(actor, eventId, { startTime, endTime });
  }

  /** Cancel an event without deleting its database record. */
  async cancelEvent(actor: EventActor, eventId: string): Promise<Event> {
    const event = await this.requireEvent(eventId);

    if (!(await this.permissions.canEdit(actor, event))) {
      throw new DomainError('You are not allowed to cancel this event.', 'FORBIDDEN', 403);
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new DomainError('Event is already cancelled.', 'INVALID_EVENT_STATE', 409);
    }

    event.cancel();
    return this.repository.update(event);
  }

  /** Approve a pending campus request. The requester cannot self-approve. */
  async approveEvent(actor: EventActor, eventId: string): Promise<Event> {
    const event = await this.requireEvent(eventId);

    if (event.scope !== EventScope.CAMPUS || event.status !== EventStatus.PENDING_APPROVAL) {
      throw new DomainError(
        'Only pending campus requests can be approved.',
        'INVALID_EVENT_STATE',
        409
      );
    }

    if (event.createdBy === actor.userId) {
      throw new DomainError(
        'You cannot approve your own campus-event request.',
        'SELF_APPROVAL',
        403
      );
    }

    if (!(await this.permissions.canApprove(actor, event))) {
      throw new DomainError('Only an Admin can approve campus events.', 'FORBIDDEN', 403);
    }

    event.status = EventStatus.ACTIVE;
    event.approvedBy = actor.userId;
    event.decidedOn = new Date();
    event.decisionNote = null;

    return this.repository.update(event);
  }

  /** Reject a pending campus request and store the required reason. */
  async rejectEvent(actor: EventActor, eventId: string, reason: string): Promise<Event> {
    if (!reason?.trim()) {
      throw new DomainError('A rejection reason is required.', 'VALIDATION_ERROR');
    }

    const event = await this.requireEvent(eventId);

    if (event.scope !== EventScope.CAMPUS || event.status !== EventStatus.PENDING_APPROVAL) {
      throw new DomainError(
        'Only pending campus requests can be rejected.',
        'INVALID_EVENT_STATE',
        409
      );
    }

    if (event.createdBy === actor.userId) {
      throw new DomainError(
        'You cannot reject your own campus-event request.',
        'SELF_APPROVAL',
        403
      );
    }

    if (!(await this.permissions.canApprove(actor, event))) {
      throw new DomainError('Only an Admin can reject campus events.', 'FORBIDDEN', 403);
    }

    event.status = EventStatus.REJECTED;
    event.approvedBy = actor.userId;
    event.decidedOn = new Date();
    event.decisionNote = reason.trim();

    return this.repository.update(event);
  }

  /**
   * Resubmit a rejected campus request. Only its original requester may do so,
   * and their REQUEST_CAMPUS_EVENT permission is checked again at resubmission
   * time so a revoked role immediately removes the ability to resubmit.
   */
  async resubmitRejectedRequest(
    actor: EventActor,
    eventId: string,
    patch: EventUpdateInput = {}
  ): Promise<EventMutationResult<Event>> {
    const event = await this.requireEvent(eventId);

    if (event.scope !== EventScope.CAMPUS || event.status !== EventStatus.REJECTED) {
      throw new DomainError(
        'Only rejected campus requests can be resubmitted.',
        'INVALID_EVENT_STATE',
        409
      );
    }

    if (event.createdBy !== actor.userId) {
      throw new DomainError(
        'Only the original requester can resubmit this request.',
        'FORBIDDEN',
        403
      );
    }

    // Recheck current permission before allowing resubmission.
    if (!(await this.permissions.canRequestCampusEvent(actor))) {
      throw new DomainError(
        'You no longer have permission to request campus events.',
        'FORBIDDEN',
        403
      );
    }

    if (patch.title !== undefined) {
      if (!patch.title.trim()) {
        throw new DomainError('Title is required.', 'VALIDATION_ERROR');
      }
      event.title = patch.title.trim();
    }

    if (patch.description !== undefined) {
      event.description = patch.description.trim();
    }

    if (patch.venue !== undefined) {
      if (!patch.venue.trim()) {
        throw new DomainError('Venue is required.', 'VALIDATION_ERROR');
      }
      event.venue = patch.venue.trim();
    }

    const start =
      patch.startTime !== undefined ? parseDate(patch.startTime, 'startTime') : event.startTime;
    const end = patch.endTime !== undefined ? parseDate(patch.endTime, 'endTime') : event.endTime;

    event.reschedule(start, end);
    event.status = EventStatus.PENDING_APPROVAL;
    event.approvedBy = null;
    event.decidedOn = null;
    event.decisionNote = null;

    await this.repository.update(event);
    return this.withClashes(event);
  }

  /** Return the campus-event requests created by this actor. */
  async getMyRequests(actor: EventActor): Promise<Event[]> {
    const events = await this.repository.findByCreator(actor.userId);
    return events.filter(event => event.scope === EventScope.CAMPUS);
  }

  /** Return the approval queue only to actors allowed to review requests. */
  async getApprovalQueue(actor: EventActor): Promise<Event[]> {
    if (!(await this.permissions.canViewApprovalQueue(actor))) {
      throw new DomainError('Only an Admin can view the approval queue.', 'FORBIDDEN', 403);
    }

    return this.repository.findPendingApproval();
  }

  private async requireEvent(eventId: string): Promise<Event> {
    const event = await this.repository.findById(eventId);

    if (!event) {
      throw new DomainError('Event not found.', 'NOT_FOUND', 404);
    }

    return event;
  }
}

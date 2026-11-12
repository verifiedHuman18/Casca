import { EventScope, EventStatus } from './event.enums';
import { EventProps, VisibilityContext } from './event.types';

export abstract class Event {
  readonly id: string;
  title: string;
  description: string;
  venue: string;
  startTime: Date;
  endTime: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
  status: EventStatus;
  approvedBy: string | null;
  decidedOn: Date | null;
  decisionNote: string | null;

  protected constructor(props: EventProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.venue = props.venue;
    this.startTime = new Date(props.startTime);
    this.endTime = new Date(props.endTime);
    this.createdBy = props.createdBy;
    this.createdAt = new Date(props.createdAt);
    this.status = props.status;
    this.approvedBy = props.approvedBy ?? null;
    this.decidedOn = props.decidedOn ? new Date(props.decidedOn) : null;
    this.decisionNote = props.decisionNote ?? null;
  }

  abstract readonly scope: EventScope;
  abstract isVisibleTo(context: VisibilityContext): boolean;

  reschedule(startTime: Date, endTime: Date): void {
    if (
      !(startTime instanceof Date) ||
      Number.isNaN(startTime.getTime()) ||
      !(endTime instanceof Date) ||
      Number.isNaN(endTime.getTime())
    ) {
      throw new Error('A valid start and end time are required.');
    }
    if (endTime <= startTime) throw new Error('Event end must be after event start.');
    this.startTime = new Date(startTime);
    this.endTime = new Date(endTime);
  }

  cancel(): void {
    this.status = EventStatus.CANCELLED;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      scope: this.scope,
      title: this.title,
      description: this.description,
      venue: this.venue,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      createdBy: this.createdBy,
      createdAt: this.createdAt.toISOString(),
      status: this.status,
      approvedBy: this.approvedBy,
      decidedOn: this.decidedOn?.toISOString() ?? null,
      decisionNote: this.decisionNote,
    };
  }
}

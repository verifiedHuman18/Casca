import { Event } from './Event';
import { ClubVisibility, EventScope, EventStatus } from './event.enums';
import { EventProps, VisibilityContext } from './event.types';

export class ClubEvent extends Event {
  readonly scope = EventScope.CLUB;
  readonly clubId: string;
  clubVisibility: ClubVisibility;

  constructor(props: EventProps) {
    super(props);
    if (!props.clubId) throw new Error('Club event requires clubId.');
    this.clubId = props.clubId;
    this.clubVisibility = props.clubVisibility ?? ClubVisibility.PUBLIC;
  }

  isVisibleTo({ viewer }: VisibilityContext): boolean {
    if (this.status !== EventStatus.ACTIVE) return false;
    if (this.clubVisibility === ClubVisibility.PUBLIC) return true;
    return (viewer.clubMembershipIds ?? []).includes(this.clubId);
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), clubId: this.clubId, clubVisibility: this.clubVisibility };
  }
}

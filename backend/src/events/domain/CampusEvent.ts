import { Event } from './Event';
import { EventScope, EventStatus } from './event.enums';
import { EventProps, VisibilityContext } from './event.types';

export class CampusEvent extends Event {
  readonly scope = EventScope.CAMPUS;

  constructor(props: EventProps) {
    super(props);
  }

  isVisibleTo({ viewer }: VisibilityContext): boolean {
    if (this.status === EventStatus.CANCELLED) return false;
    if (this.status === EventStatus.ACTIVE) return true;
    return viewer.isAdmin === true || viewer.userId === this.createdBy;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON() };
  }
}

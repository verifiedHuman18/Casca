import type { AuthUser } from '@senoom/shared';
import { ClubVisibility, EventScope, EventStatus } from './event.enums';

export interface EventActor {
  userId: string;
  /** Full trusted user from authentication; absent only in isolated test fakes. */
  authUser?: AuthUser;
  /** Student's own section. Admins may omit this. */
  sectionId?: string | null;
  /** Club IDs the actor currently belongs to, used only for visibility. */
  clubMembershipIds?: string[];
  /** Set by trusted authentication middleware, never from request JSON. */
  isAdmin?: boolean;
}

export interface EventProps {
  id: string;
  title: string;
  description: string;
  venue: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  createdAt: Date;
  status: EventStatus;
  approvedBy?: string | null;
  decidedOn?: Date | null;
  decisionNote?: string | null;
  clubId?: string | null;
  clubVisibility?: ClubVisibility | null;
  targetSectionIds?: string[];
}

export interface EventCreateInput {
  scope: EventScope;
  title: string;
  description: string;
  venue: string;
  startTime: string | Date;
  endTime: string | Date;
  clubId?: string;
  clubVisibility?: ClubVisibility;
  /** Accepted only to validate server-side; SECTION creation is forced to actor's section. */
  targetSectionIds?: string[];
}

export interface EventUpdateInput {
  title?: string;
  description?: string;
  venue?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  clubVisibility?: ClubVisibility;
}

export interface VisibilityContext {
  viewer: EventActor;
  /** Extra sections selected by the viewer in their calendar. */
  extraSectionIds?: string[];
}

export interface ClashWarning {
  eventId: string;
  title: string;
  venue: string;
  startTime: Date;
  endTime: Date;
}

export interface EventMutationResult<T> {
  event: T;
  clashWarnings: ClashWarning[];
}

export interface CalendarFilterInput {
  from?: string | Date;
  to?: string | Date;
  clubIds?: string[];
  sectionIds?: string[];
  includeCancelled?: boolean;
}

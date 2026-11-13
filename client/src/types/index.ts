import {
  ScopeType,
  EventStatus,
  ClubVisibility,
  Permission,
  CourseName,
  VALID_COURSES,
  VALID_SECTIONS_BY_COURSE,
} from '@senoom/shared';

export {
  ScopeType,
  EventStatus,
  ClubVisibility,
  Permission,
  VALID_COURSES,
  VALID_SECTIONS_BY_COURSE,
};
export type { CourseName };

export interface UIEventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  scope: ScopeType;
  clubName?: string;
  targetSections?: string[];
  status: EventStatus;
  isReadOnly?: boolean;
}

export interface UserSession {
  userId: string;
  name: string;
  enrollmentNo: string;
  course: CourseName;
  section: string;
  year: number;
  positions: string[];
  clubs: string[];
}

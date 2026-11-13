/**
 * Casca - Shared Enums and Interfaces
 * Single source of truth for core domain constants across backend and client.
 */

export enum UserType {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum ScopeType {
  CAMPUS = 'CAMPUS',
  CLUB = 'CLUB',
  SECTION = 'SECTION',
}

export enum EventStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ClubVisibility {
  PUBLIC = 'PUBLIC',
  MEMBERS_ONLY = 'MEMBERS_ONLY',
}

export enum Permission {
  CREATE_CAMPUS_EVENT = 'CREATE_CAMPUS_EVENT',
  REQUEST_CAMPUS_EVENT = 'REQUEST_CAMPUS_EVENT',
  APPROVE_CAMPUS_EVENT = 'APPROVE_CAMPUS_EVENT',
  CREATE_CLUB_EVENT = 'CREATE_CLUB_EVENT',
  CREATE_SECTION_EVENT = 'CREATE_SECTION_EVENT',
  EDIT_ANY_IN_SCOPE = 'EDIT_ANY_IN_SCOPE',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_REGISTRY = 'MANAGE_REGISTRY',
}

export const VALID_COURSES = ['IT', 'IT-BI', 'ECE'] as const;
export type CourseName = (typeof VALID_COURSES)[number];

export const VALID_SECTIONS_BY_COURSE: Record<CourseName, string[]> = {
  IT: ['A', 'B', 'C'],
  'IT-BI': ['C'],
  ECE: ['D'],
};

export * from './auth';
export * from './api';

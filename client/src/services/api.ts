import { ScopeType, EventStatus, ClubVisibility, UIEventItem, UserSession } from '../types';
import { UserType, type AuthResponse, type AuthUser } from '@senoom/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export const INITIAL_MOCK_USER: UserSession = {
  userId: 'usr-student-1',
  name: 'Aarav Sharma',
  enrollmentNo: 'IIT2023001',
  course: 'IT',
  section: 'A',
  year: 2,
  positions: ['Class Representative', 'Club Coordinator'],
  clubs: ['Coding Club'],
};

export const INITIAL_MOCK_EVENTS: UIEventItem[] = [
  // Today (Thursday, Nov 12, 2026)
  {
    id: 'evt-101',
    title: 'Discrete Mathematics & Graph Theory Lecture',
    description:
      'Special guest session covering spectral graph theory and tree traversal algorithms.',
    venue: 'Academic Block 2 · Room 204',
    startTime: '2026-11-12T04:30:00.000Z', // 10:00 AM IST
    endTime: '2026-11-12T06:00:00.000Z', // 11:30 AM IST
    scope: ScopeType.SECTION,
    targetSections: ['IT-A'],
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-102',
    title: 'Casca Campus Platform Architecture Walkthrough',
    description:
      'System design briefing on event scheduling, multi-tenancy, and clean 4-layer architecture.',
    venue: 'Main Seminar Hall',
    startTime: '2026-11-12T08:30:00.000Z', // 02:00 PM IST
    endTime: '2026-11-12T10:30:00.000Z', // 04:00 PM IST
    scope: ScopeType.CAMPUS,
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-103',
    title: 'Competitive Programming Contest #4',
    description:
      'Weekly algorithmic contest hosted by the Coding Club with dynamic ranking scoreboard.',
    venue: 'Computer Center Lab 2',
    startTime: '2026-11-12T13:00:00.000Z', // 06:30 PM IST
    endTime: '2026-11-12T15:00:00.000Z', // 08:30 PM IST
    scope: ScopeType.CLUB,
    clubName: 'Coding Club',
    status: EventStatus.ACTIVE,
  },

  // Tomorrow (Friday, Nov 13, 2026)
  {
    id: 'evt-104',
    title: 'Annual Tech Symposium 2026 - Hackathon Kickoff',
    description:
      'Campus-wide flagship tech symposium with keynote lectures and 36-hour hackathon rounds.',
    venue: 'Main Auditorium & Atrium',
    startTime: '2026-11-13T04:00:00.000Z', // 09:30 AM IST
    endTime: '2026-11-13T11:30:00.000Z', // 05:00 PM IST
    scope: ScopeType.CAMPUS,
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-105',
    title: 'Software Engineering Lab - Agile Sprint Review',
    description: 'Sprint planning and user story acceptance tests with course instructors.',
    venue: 'Software Lab 3',
    startTime: '2026-11-13T05:30:00.000Z', // 11:00 AM IST
    endTime: '2026-11-13T07:30:00.000Z', // 01:00 PM IST
    scope: ScopeType.SECTION,
    targetSections: ['IT-A'],
    status: EventStatus.ACTIVE,
  },

  // Saturday (Nov 14, 2026)
  {
    id: 'evt-106',
    title: 'Web3 & Distributed Systems Deep Dive',
    description: 'Hands-on smart contract architecture and state replication hands-on workshop.',
    venue: 'Seminar Hall B',
    startTime: '2026-11-14T04:30:00.000Z', // 10:00 AM IST
    endTime: '2026-11-14T07:30:00.000Z', // 01:00 PM IST
    scope: ScopeType.CLUB,
    clubName: 'Coding Club',
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-107',
    title: 'Robotics Club Sensor Integration Workshop',
    description:
      'Microcontroller interfacing with LiDAR, ultrasonic telemetry, and ROS2 navigation.',
    venue: 'Hardware Prototyping Lab',
    startTime: '2026-11-14T09:30:00.000Z', // 03:00 PM IST
    endTime: '2026-11-14T12:30:00.000Z', // 06:00 PM IST
    scope: ScopeType.CLUB,
    clubName: 'Robotics Club',
    status: EventStatus.ACTIVE,
  },

  // Sunday (Nov 15, 2026)
  {
    id: 'evt-108',
    title: 'OOPS Lab Practical Assessment & Review',
    description:
      'Internal evaluation and practical test for Section IT-A students on design patterns and polymorphism.',
    venue: 'Lab Room 104',
    startTime: '2026-11-15T05:30:00.000Z', // 11:00 AM IST
    endTime: '2026-11-15T07:30:00.000Z', // 01:00 PM IST
    scope: ScopeType.SECTION,
    targetSections: ['IT-A'],
    status: EventStatus.ACTIVE,
  },

  // Monday (Nov 16, 2026) - IT-B Section Event (for cross-section browsing)
  {
    id: 'evt-109',
    title: 'Operating Systems - Concurrency & Synchronization',
    description: 'Critical section problem, semaphores, and monitor synchronization primitives.',
    venue: 'Block 1 · Lecture Room 301',
    startTime: '2026-11-16T04:30:00.000Z', // 10:00 AM IST
    endTime: '2026-11-16T06:30:00.000Z', // 12:00 PM IST
    scope: ScopeType.SECTION,
    targetSections: ['IT-B'],
    status: EventStatus.ACTIVE,
    isReadOnly: true,
  },

  // Wednesday (Nov 18, 2026)
  {
    id: 'evt-110',
    title: 'Open Source Contribution Jam #2',
    description: 'Pair programming and issue triage across popular GitHub student repositories.',
    venue: 'Innovation Hub · 2nd Floor',
    startTime: '2026-11-18T10:30:00.000Z', // 04:00 PM IST
    endTime: '2026-11-18T12:30:00.000Z', // 06:00 PM IST
    scope: ScopeType.CLUB,
    clubName: 'Coding Club',
    status: EventStatus.ACTIVE,
  },

  // Friday (Nov 20, 2026) - Campus Event Pending Approval
  {
    id: 'evt-111',
    title: 'Campus Placement Orientation & Mock Technical Interviews',
    description: 'Alumni mentorship session for internship preparedness and resume critiques.',
    venue: 'Main Auditorium',
    startTime: '2026-11-20T08:30:00.000Z', // 02:00 PM IST
    endTime: '2026-11-20T11:30:00.000Z', // 05:00 PM IST
    scope: ScopeType.CAMPUS,
    status: EventStatus.PENDING_APPROVAL,
  },
];

interface RawBackendEvent {
  id: string;
  title: string;
  description: string;
  venue: string;
  startTime: string;
  endTime: string;
  scope: ScopeType;
  status: EventStatus;
  clubId?: string | null;
  clubName?: string;
  clubVisibility?: ClubVisibility | null;
  targetSectionIds?: string[];
  targetSections?: string[];
  createdBy?: string;
  rejectionReason?: string;
}

function mapBackendEventToUI(raw: RawBackendEvent): UIEventItem {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    venue: raw.venue,
    startTime: raw.startTime,
    endTime: raw.endTime,
    scope: raw.scope,
    clubName: raw.clubName || (raw.clubId ? `Club ${raw.clubId.slice(0, 6)}` : undefined),
    targetSections: raw.targetSectionIds ?? raw.targetSections ?? [],
    status: raw.status,
    createdBy: raw.createdBy,
    rejectionReason: raw.rejectionReason,
  };
}

export function authUserToSession(authUser: AuthUser): UserSession {
  return {
    userId: authUser.userId,
    name: authUser.name,
    enrollmentNo: authUser.enrollmentNo ?? 'ADMIN',
    course: (authUser.course ?? 'IT') as UserSession['course'],
    section: authUser.sectionId ?? 'A',
    year: authUser.year ?? 1,
    positions: authUser.assignments.map(a => a.positionName),
    clubs: authUser.clubIds,
  };
}

export interface FetchCalendarFilter {
  from?: string;
  to?: string;
  clubIds?: string[];
  sectionIds?: string[];
}

export async function fetchCalendarEvents(filter?: FetchCalendarFilter): Promise<UIEventItem[]> {
  try {
    const params = new URLSearchParams();
    if (filter?.from) params.set('from', filter.from);
    if (filter?.to) params.set('to', filter.to);
    if (filter?.clubIds) {
      filter.clubIds.forEach(id => params.append('clubIds', id));
    }
    if (filter?.sectionIds) {
      filter.sectionIds.forEach(id => params.append('sectionIds', id));
    }

    const qs = params.toString();
    const url = `${API_BASE_URL}/api/calendar${qs ? `?${qs}` : ''}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const data = await res.json();
    const rawEvents: RawBackendEvent[] = Array.isArray(data)
      ? data
      : Array.isArray(data.events)
        ? data.events
        : [];

    if (rawEvents.length > 0) {
      return rawEvents.map(mapBackendEventToUI);
    }
    return INITIAL_MOCK_EVENTS;
  } catch {
    // Graceful fallback to initial events for offline, preview or missing token
    return INITIAL_MOCK_EVENTS;
  }
}

export interface CreateEventPayload {
  title: string;
  description: string;
  venue: string;
  startTime: string;
  endTime: string;
  scope: ScopeType;
  clubId?: string;
  clubVisibility?: ClubVisibility;
  targetSectionIds?: string[];
}

export async function createNewEvent(
  event: Omit<UIEventItem, 'id' | 'status'>
): Promise<UIEventItem> {
  try {
    if (authToken) {
      const isCampusRequest = event.scope === ScopeType.CAMPUS;
      const url = isCampusRequest
        ? `${API_BASE_URL}/api/events/campus-requests`
        : `${API_BASE_URL}/api/events`;

      const payload: CreateEventPayload = {
        title: event.title,
        description: event.description,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        scope: event.scope,
        targetSectionIds: event.targetSections,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();
        const created = body.event ?? body;
        return mapBackendEventToUI(created);
      }
    }
  } catch {
    // Fall back to local creation
  }

  // Graceful local creation for offline / standalone preview
  const newEvent: UIEventItem = {
    ...event,
    id: `evt-${Date.now()}`,
    status: event.scope === ScopeType.CAMPUS ? EventStatus.PENDING_APPROVAL : EventStatus.ACTIVE,
  };
  return newEvent;
}

export async function loginApi(
  identifier: { enrollmentNo: string } | { email: string },
  password: string
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identifier, password }),
    });

    if (res.ok) {
      const data: AuthResponse = await res.json();
      setAuthToken(data.token);
      return data;
    } else {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || `Login failed (${res.status})`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg && !msg.includes('fetch failed') && !msg.includes('ECONNREFUSED')) {
      throw err;
    }

    // Offline / Standalone Mock Fallback
    const isAdmin = 'email' in identifier && identifier.email.includes('admin');
    const mockUser: AuthUser = isAdmin
      ? {
          userId: 'usr-admin-1',
          name: 'SAC Admin',
          type: UserType.ADMIN,
          enrollmentNo: null,
          sectionId: null,
          course: null,
          year: null,
          assignments: [
            {
              assignmentId: 'asg-admin',
              positionId: 'pos-admin',
              positionName: 'Admin',
              scopeType: ScopeType.CAMPUS,
              permissions: [],
              clubId: null,
              sectionId: null,
              endsOn: null,
            },
          ],
          clubIds: [],
        }
      : {
          userId: 'usr-student-1',
          name: 'Aarav Sharma',
          type: UserType.STUDENT,
          enrollmentNo: 'enrollmentNo' in identifier ? identifier.enrollmentNo : 'IIT2023001',
          course: 'IT',
          sectionId: 'A',
          year: 2,
          assignments: [
            {
              assignmentId: 'asg-cr',
              positionId: 'pos-cr',
              positionName: 'Class Representative',
              scopeType: ScopeType.SECTION,
              permissions: [],
              clubId: null,
              sectionId: 'IT-A',
              endsOn: null,
            },
          ],
          clubIds: ['Coding Club'],
        };

    const mockResp: AuthResponse = {
      token: `mock-jwt-token-${Date.now()}`,
      user: mockUser,
    };
    setAuthToken(mockResp.token);
    return mockResp;
  }
}

export async function logoutApi(): Promise<void> {
  if (authToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {
      // Ignore network failures on logout
    }
  }
  setAuthToken(null);
}

export async function signUpStudentApi(input: {
  name: string;
  enrollmentNo: string;
  sectionId: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      const data: AuthResponse = await res.json();
      setAuthToken(data.token);
      return data;
    } else {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody?.error?.message || `Sign up failed (${res.status})`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg && !msg.includes('fetch failed') && !msg.includes('ECONNREFUSED')) {
      throw err;
    }

    // Offline / Standalone Mock Fallback
    const mockResp: AuthResponse = {
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        userId: `usr-${Date.now()}`,
        name: input.name,
        type: UserType.STUDENT,
        enrollmentNo: input.enrollmentNo,
        course: input.sectionId.split('-')[0] || 'IT',
        sectionId: input.sectionId.split('-')[1] || 'A',
        year: 1,
        assignments: [],
        clubIds: [],
      },
    };
    setAuthToken(mockResp.token);
    return mockResp;
  }
}

// ─── Approval Queue & My Requests Mock Fallbacks ──────────────────────────────
export const INITIAL_MOCK_APPROVAL_QUEUE: UIEventItem[] = [
  {
    id: 'evt-111',
    title: 'Campus Placement Orientation & Mock Technical Interviews',
    description:
      'Alumni mentorship session for internship preparedness and resume critiques submitted by the Coding Club.',
    venue: 'Main Auditorium',
    startTime: '2026-11-20T08:30:00.000Z',
    endTime: '2026-11-20T11:30:00.000Z',
    scope: ScopeType.CAMPUS,
    clubName: 'Coding Club',
    status: EventStatus.PENDING_APPROVAL,
  },
  {
    id: 'evt-112',
    title: 'Inter-College RoboWars Championship 2026',
    description:
      'Flagship robotic combat tournament open to all colleges, organized by Robotics Society.',
    venue: 'Campus Open Air Theatre',
    startTime: '2026-11-28T04:30:00.000Z',
    endTime: '2026-11-28T12:30:00.000Z',
    scope: ScopeType.CAMPUS,
    clubName: 'Robotics Club',
    status: EventStatus.PENDING_APPROVAL,
  },
];

export const INITIAL_MOCK_MY_REQUESTS: UIEventItem[] = [
  {
    id: 'evt-111',
    title: 'Campus Placement Orientation & Mock Technical Interviews',
    description:
      'Alumni mentorship session for internship preparedness and resume critiques submitted by the Coding Club.',
    venue: 'Main Auditorium',
    startTime: '2026-11-20T08:30:00.000Z',
    endTime: '2026-11-20T11:30:00.000Z',
    scope: ScopeType.CAMPUS,
    clubName: 'Coding Club',
    status: EventStatus.PENDING_APPROVAL,
  },
  {
    id: 'evt-113',
    title: 'Late Night Acoustic Music Jam',
    description: 'Acoustic jam session at the Student Activity Center.',
    venue: 'Student Activity Center Lawn',
    startTime: '2026-11-10T14:30:00.000Z',
    endTime: '2026-11-10T17:30:00.000Z',
    scope: ScopeType.CAMPUS,
    clubName: 'Music Club',
    status: EventStatus.REJECTED,
  },
];

// ─── Approval Queue API ──────────────────────────────────────────────────────
export async function fetchApprovalQueue(): Promise<UIEventItem[]> {
  try {
    if (authToken) {
      const res = await fetch(`${API_BASE_URL}/api/events/approval-queue`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const rawEvents: RawBackendEvent[] = Array.isArray(data.events)
          ? data.events
          : Array.isArray(data)
            ? data
            : [];
        return rawEvents.map(mapBackendEventToUI);
      }
    }
  } catch {
    // Fall back to mock queue
  }
  return INITIAL_MOCK_APPROVAL_QUEUE;
}

export async function approveEventApi(eventId: string): Promise<void> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/approve`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to approve event (${res.status})`);
    }
  }
}

export async function rejectEventApi(eventId: string, reason: string): Promise<void> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to reject event (${res.status})`);
    }
  }
}

// ─── My Requests API ─────────────────────────────────────────────────────────
export async function fetchMyRequests(): Promise<UIEventItem[]> {
  try {
    if (authToken) {
      const res = await fetch(`${API_BASE_URL}/api/events/my-requests`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const rawEvents: RawBackendEvent[] = Array.isArray(data.events)
          ? data.events
          : Array.isArray(data)
            ? data
            : [];
        return rawEvents.map(mapBackendEventToUI);
      }
    }
  } catch {
    // Fall back to mock requests
  }
  return INITIAL_MOCK_MY_REQUESTS;
}

export async function resubmitEventApi(
  eventId: string,
  payload: Partial<CreateEventPayload>
): Promise<UIEventItem> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const body = await res.json();
      const updated = body.event ?? body;
      return mapBackendEventToUI(updated);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to resubmit (${res.status})`);
  }
  return {
    id: eventId,
    title: payload.title || 'Resubmitted Event',
    description: payload.description || '',
    venue: payload.venue || 'TBD',
    startTime: payload.startTime || new Date().toISOString(),
    endTime: payload.endTime || new Date().toISOString(),
    scope: ScopeType.CAMPUS,
    status: EventStatus.PENDING_APPROVAL,
  };
}

// ─── Event Mutation Actions (Edit, Reschedule, Cancel) ───────────────────────
export async function updateEventApi(
  eventId: string,
  updates: Partial<CreateEventPayload>
): Promise<UIEventItem> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const body = await res.json();
      const updated = body.event ?? body;
      return mapBackendEventToUI(updated);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Update failed (${res.status})`);
  }
  return {
    id: eventId,
    title: updates.title || 'Updated Event',
    description: updates.description || '',
    venue: updates.venue || '',
    startTime: updates.startTime || new Date().toISOString(),
    endTime: updates.endTime || new Date().toISOString(),
    scope: updates.scope || ScopeType.SECTION,
    status: EventStatus.ACTIVE,
  };
}

export async function rescheduleEventApi(
  eventId: string,
  startTime: string,
  endTime: string
): Promise<UIEventItem> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ startTime, endTime }),
    });
    if (res.ok) {
      const body = await res.json();
      const updated = body.event ?? body;
      return mapBackendEventToUI(updated);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Reschedule failed (${res.status})`);
  }
  return {
    id: eventId,
    title: 'Rescheduled Event',
    description: '',
    venue: '',
    startTime,
    endTime,
    scope: ScopeType.SECTION,
    status: EventStatus.ACTIVE,
  };
}

export async function cancelEventApi(eventId: string): Promise<void> {
  if (authToken) {
    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/cancel`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Cancel failed (${res.status})`);
    }
  }
}

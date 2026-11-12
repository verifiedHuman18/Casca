import { ScopeType, EventStatus, UIEventItem, UserSession } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  {
    id: 'evt-1',
    title: 'Annual Tech Symposium 2026',
    description: 'Campus-wide flagship tech symposium with keynote lectures and hackathons.',
    venue: 'Main Auditorium',
    startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 28).toISOString(),
    scope: ScopeType.CAMPUS,
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-2',
    title: 'Competitive Programming Contest #4',
    description: 'Weekly algorithmic contest hosted by the Coding Club.',
    venue: 'Computer Center Lab 2',
    startTime: new Date(Date.now() + 3600000 * 48).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 51).toISOString(),
    scope: ScopeType.CLUB,
    clubName: 'Coding Club',
    status: EventStatus.ACTIVE,
  },
  {
    id: 'evt-3',
    title: 'OOPS Lab Assessment & Review',
    description: 'Internal evaluation and practical test for Section IT-A students.',
    venue: 'Lab Room 104',
    startTime: new Date(Date.now() + 3600000 * 72).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 74).toISOString(),
    scope: ScopeType.SECTION,
    targetSections: ['IT-A'],
    status: EventStatus.ACTIVE,
  },
];

export async function fetchCalendarEvents(): Promise<UIEventItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/calendar`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : INITIAL_MOCK_EVENTS;
  } catch {
    // Graceful fallback to initial events for offline / preview
    return INITIAL_MOCK_EVENTS;
  }
}

export async function createNewEvent(
  event: Omit<UIEventItem, 'id' | 'status'>
): Promise<UIEventItem> {
  const newEvent: UIEventItem = {
    ...event,
    id: `evt-${Date.now()}`,
    status: event.scope === ScopeType.CAMPUS ? EventStatus.PENDING_APPROVAL : EventStatus.ACTIVE,
  };
  return newEvent;
}

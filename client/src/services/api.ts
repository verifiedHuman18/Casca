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

  // Monday (Nov 16, 2026) - IT-B Section Event (for UC-04 cross-section browsing)
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

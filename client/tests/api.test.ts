import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAuthToken,
  getAuthToken,
  authUserToSession,
  fetchCalendarEvents,
  createNewEvent,
  fetchApprovalQueue,
  approveEventApi,
  rejectEventApi,
  fetchMyRequests,
  resubmitEventApi,
  updateEventApi,
  rescheduleEventApi,
  cancelEventApi,
  loginApi,
  signUpStudentApi,
  logoutApi,
} from '../src/services/api';
import { ScopeType, EventStatus } from '../src/types';
import { UserType, type AuthUser } from '@senoom/shared';

describe('Client API Service & Offline Mocks (client/src/services/api.ts)', () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  describe('Auth Token Management', () => {
    it('stores and retrieves JWT tokens in memory', () => {
      expect(getAuthToken()).toBeNull();
      setAuthToken('mock-jwt-token-12345');
      expect(getAuthToken()).toBe('mock-jwt-token-12345');
      setAuthToken(null);
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('authUserToSession Mapping', () => {
    it('correctly transforms backend AuthUser to client UserSession', () => {
      const mockAuthUser: AuthUser = {
        userId: 'usr-42',
        name: 'Priya Verma',
        type: UserType.STUDENT,
        enrollmentNo: 'IIT2023042',
        course: 'IT',
        sectionId: 'B',
        year: 2,
        assignments: [
          {
            assignmentId: 'asg-1',
            positionId: 'pos-cr',
            positionName: 'Class Representative',
            scopeType: ScopeType.SECTION,
            permissions: [],
            clubId: null,
            sectionId: 'IT-B',
            endsOn: null,
          },
        ],
        clubIds: ['Coding Club'],
      };

      const session = authUserToSession(mockAuthUser);
      expect(session.userId).toBe('usr-42');
      expect(session.name).toBe('Priya Verma');
      expect(session.enrollmentNo).toBe('IIT2023042');
      expect(session.course).toBe('IT');
      expect(session.section).toBe('B');
      expect(session.year).toBe(2);
      expect(session.positions).toEqual(['Class Representative']);
      expect(session.clubs).toEqual(['Coding Club']);
    });
  });

  describe('Calendar Events Feed', () => {
    it('fetches mock calendar events when backend server is offline', async () => {
      const events = await fetchCalendarEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('id');
      expect(events[0]).toHaveProperty('title');
      expect(events[0]).toHaveProperty('venue');
      expect(events[0]).toHaveProperty('startTime');
      expect(events[0]).toHaveProperty('endTime');
      expect(events[0]).toHaveProperty('scope');
      expect(events[0]).toHaveProperty('status');
    });

    it('creates a new Section event directly as ACTIVE', async () => {
      const newEvt = await createNewEvent({
        title: 'Algorithms Tutorial #3',
        description: 'Dynamic programming state formulations',
        venue: 'Room 201',
        startTime: '2026-11-13T10:00:00.000Z',
        endTime: '2026-11-13T11:30:00.000Z',
        scope: ScopeType.SECTION,
        targetSections: ['IT-A'],
      });

      expect(newEvt.id).toBeDefined();
      expect(newEvt.title).toBe('Algorithms Tutorial #3');
      expect(newEvt.status).toBe(EventStatus.ACTIVE);
      expect(newEvt.scope).toBe(ScopeType.SECTION);
    });

    it('creates Campus proposals with PENDING_APPROVAL status for SAC review', async () => {
      const campusEvt = await createNewEvent({
        title: 'Open Source Hacknight',
        description: 'Overnight collaborative bug hunt',
        venue: 'CC3 Lab',
        startTime: '2026-11-14T14:00:00.000Z',
        endTime: '2026-11-14T22:00:00.000Z',
        scope: ScopeType.CAMPUS,
        clubName: 'Coding Club',
      });

      expect(campusEvt.status).toBe(EventStatus.PENDING_APPROVAL);
      expect(campusEvt.scope).toBe(ScopeType.CAMPUS);
    });
  });

  describe('Approval Queue Workflow (UC-15)', () => {
    it('retrieves pending approval proposals', async () => {
      const queue = await fetchApprovalQueue();
      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBeGreaterThan(0);
      queue.forEach(item => {
        expect(item.status).toBe(EventStatus.PENDING_APPROVAL);
      });
    });

    it('approves an event and updates its status', async () => {
      const queue = await fetchApprovalQueue();
      const first = queue[0];
      await expect(approveEventApi(first.id)).resolves.not.toThrow();
    });

    it('rejects an event with a required decision note', async () => {
      const queue = await fetchApprovalQueue();
      const item = queue[0];
      await expect(
        rejectEventApi(item.id, 'Venue conflict with University Convocation')
      ).resolves.not.toThrow();
    });
  });

  describe('My Requests & Resubmission (UC-14)', () => {
    it('retrieves user proposals including rejected items', async () => {
      const requests = await fetchMyRequests();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
      const hasRejected = requests.some(r => r.status === EventStatus.REJECTED);
      expect(hasRejected).toBe(true);
    });

    it('resubmits a rejected proposal resetting status to PENDING_APPROVAL', async () => {
      const resubmitted = await resubmitEventApi('req-mock-3', {
        title: 'Campus Photography Exhibition (Updated Venue)',
        description: 'Shifted to Open Air Theatre as requested by council',
        venue: 'Open Air Theatre Stage B',
        startTime: '2026-11-21T09:00:00.000Z',
        endTime: '2026-11-21T14:00:00.000Z',
        scope: ScopeType.CLUB,
      });

      expect(resubmitted.id).toBe('req-mock-3');
      expect(resubmitted.status).toBe(EventStatus.PENDING_APPROVAL);
      expect(resubmitted.venue).toBe('Open Air Theatre Stage B');
    });
  });

  describe('Event Mutations (UC-08)', () => {
    it('updates event title and venue', async () => {
      const updated = await updateEventApi('evt-101', {
        title: 'DBMS Lecture - Relational Calculus & SQL',
        venue: 'Lecture Hall 102',
      });

      expect(updated.id).toBe('evt-101');
      expect(updated.title).toBe('DBMS Lecture - Relational Calculus & SQL');
      expect(updated.venue).toBe('Lecture Hall 102');
    });

    it('reschedules event session to new start and end times', async () => {
      const newStart = '2026-11-13T09:00:00.000Z';
      const newEnd = '2026-11-13T10:30:00.000Z';

      const rescheduled = await rescheduleEventApi('evt-101', newStart, newEnd);
      expect(rescheduled.id).toBe('evt-101');
      expect(rescheduled.startTime).toBe(newStart);
      expect(rescheduled.endTime).toBe(newEnd);
    });

    it('cancels an event successfully', async () => {
      await expect(cancelEventApi('evt-101')).resolves.not.toThrow();
    });
  });

  describe('Authentication (UC-01, UC-13)', () => {
    it('signs in a student using enrollment number and password', async () => {
      const resp = await loginApi({ enrollmentNo: 'IIT2023001' }, 'student123');
      expect(resp.token).toBeDefined();
      expect(resp.user.enrollmentNo).toBe('IIT2023001');
      expect(resp.user.name).toBeDefined();
    });

    it('signs in an administrator using email and password', async () => {
      const resp = await loginApi({ email: 'admin@iiita.ac.in' }, 'admin123');
      expect(resp.token).toBeDefined();
      expect(resp.user.type).toBe(UserType.ADMIN);
      expect(resp.user.assignments.some(a => a.positionName === 'Admin')).toBe(true);
    });

    it('registers a new student self sign-up', async () => {
      const resp = await signUpStudentApi({
        name: 'Karan Mehra',
        enrollmentNo: 'IIT2023099',
        sectionId: 'IT-A',
        password: 'securePassword123',
      });

      expect(resp.token).toBeDefined();
      expect(resp.user.name).toBe('Karan Mehra');
      expect(resp.user.enrollmentNo).toBe('IIT2023099');
    });

    it('logs out and clears the stored session token', async () => {
      setAuthToken('active-token-99');
      expect(getAuthToken()).toBe('active-token-99');
      await logoutApi();
      expect(getAuthToken()).toBeNull();
    });
  });
});

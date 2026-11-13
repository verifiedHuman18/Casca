import {
  AuthAssignment,
  AuthUser,
  EventRef,
  EventStatus,
  Permission,
  ScopeType,
  UserType,
} from '@senoom/shared';
import { describe, expect, it } from 'vitest';
import { PermissionService } from '../../src/services/PermissionService';

const NOW = new Date('2026-11-12T00:00:00Z');
const service = new PermissionService(() => NOW);

const CLUB_PUBLISHER = [
  Permission.CREATE_CLUB_EVENT,
  Permission.REQUEST_CAMPUS_EVENT,
  Permission.EDIT_ANY_IN_SCOPE,
];

const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  userId: 'u1',
  name: 'Test',
  type: UserType.STUDENT,
  enrollmentNo: 'IIT2025001',
  sectionId: 'sec-a',
  course: 'IT',
  year: 2,
  assignments: [],
  clubIds: [],
  ...over,
});

const admin = (): AuthUser =>
  user({
    userId: 'admin1',
    type: UserType.ADMIN,
    enrollmentNo: null,
    sectionId: null,
    course: null,
    year: null,
  });

const clubRole = (
  clubId: string,
  permissions: Permission[] = CLUB_PUBLISHER,
  endsOn: string | null = null
): AuthAssignment => ({
  assignmentId: `a-${clubId}`,
  positionId: 'p-club',
  positionName: 'Club role',
  scopeType: ScopeType.CLUB,
  permissions,
  clubId,
  sectionId: null,
  endsOn,
});

const crRole = (sectionId: string): AuthAssignment => ({
  assignmentId: `a-${sectionId}`,
  positionId: 'p-cr',
  positionName: 'Class Representative',
  scopeType: ScopeType.SECTION,
  permissions: [Permission.CREATE_SECTION_EVENT, Permission.EDIT_ANY_IN_SCOPE],
  clubId: null,
  sectionId,
  endsOn: null,
});

const event = (over: Partial<EventRef> = {}): EventRef => ({
  scope: ScopeType.CLUB,
  clubId: 'x',
  targetSectionIds: [],
  createdBy: 'someone-else',
  status: EventStatus.ACTIVE,
  ...over,
});

describe('PermissionService.canPublish', () => {
  it('secretary of X and member of Y: can publish for X, not Y', () => {
    const u = user({ assignments: [clubRole('x'), clubRole('y', [])] });
    expect(service.canPublish(u, ScopeType.CLUB, 'x')).toBe(true);
    expect(service.canPublish(u, ScopeType.CLUB, 'y')).toBe(false);
  });

  it('CR of IT-A cannot publish for IT-B', () => {
    const u = user({ assignments: [crRole('it-a')] });
    expect(service.canPublish(u, ScopeType.SECTION, 'it-a')).toBe(true);
    expect(service.canPublish(u, ScopeType.SECTION, 'it-b')).toBe(false);
  });

  it('a plain club member cannot publish', () => {
    const u = user({ assignments: [clubRole('x', [])] });
    expect(service.canPublish(u, ScopeType.CLUB, 'x')).toBe(false);
  });

  it('admin can publish CAMPUS but not CLUB or SECTION events directly', () => {
    expect(service.canPublish(admin(), ScopeType.CAMPUS)).toBe(true);
    expect(service.canPublish(admin(), ScopeType.CLUB, 'x')).toBe(false);
    expect(service.canPublish(admin(), ScopeType.SECTION, 'it-a')).toBe(false);
  });

  it('club president cannot publish CAMPUS but can request it', () => {
    const u = user({ assignments: [clubRole('x')] });
    expect(service.canPublish(u, ScopeType.CAMPUS)).toBe(false);
    expect(service.canRequestCampusEvent(u)).toBe(true);
  });

  it('a revoked assignment gives nothing on the next call', () => {
    const ended = clubRole('x', CLUB_PUBLISHER, NOW.toISOString());
    expect(service.canPublish(user({ assignments: [ended] }), ScopeType.CLUB, 'x')).toBe(false);
    const future = clubRole('x', CLUB_PUBLISHER, '2099-01-01T00:00:00Z');
    expect(service.canPublish(user({ assignments: [future] }), ScopeType.CLUB, 'x')).toBe(true);
  });

  it('a student with no assignments cannot do anything', () => {
    const u = user();
    expect(service.canPublish(u, ScopeType.CAMPUS)).toBe(false);
    expect(service.canPublish(u, ScopeType.CLUB, 'x')).toBe(false);
    expect(service.canPublish(u, ScopeType.SECTION, 'it-a')).toBe(false);
    expect(service.canRequestCampusEvent(u)).toBe(false);
  });

  it('needs a target for club and section scopes', () => {
    const u = user({ assignments: [clubRole('x'), crRole('it-a')] });
    expect(service.canPublish(u, ScopeType.CLUB)).toBe(false);
    expect(service.canPublish(u, ScopeType.SECTION)).toBe(false);
  });

  it('a club assignment never grants rights in another scope type', () => {
    const odd = { ...clubRole('x'), permissions: [Permission.CREATE_SECTION_EVENT] };
    expect(service.canPublish(user({ assignments: [odd] }), ScopeType.SECTION, 'x')).toBe(false);
  });
});

describe('PermissionService.canApprove', () => {
  it('admin can approve someone else’s request', () => {
    expect(service.canApprove(admin(), event({ scope: ScopeType.CAMPUS }))).toBe(true);
  });

  it('nobody can approve their own request', () => {
    const own = event({ scope: ScopeType.CAMPUS, createdBy: 'admin1' });
    expect(service.canApprove(admin(), own)).toBe(false);
  });

  it('a club president cannot approve', () => {
    const u = user({ assignments: [clubRole('x')] });
    expect(service.canApprove(u, event({ scope: ScopeType.CAMPUS }))).toBe(false);
  });
});

describe('PermissionService.canEdit', () => {
  it('the creator can edit', () => {
    expect(service.canEdit(user(), event({ createdBy: 'u1' }))).toBe(true);
  });

  it('a holder of the club publishing permission can edit that club’s events only', () => {
    const u = user({ assignments: [clubRole('x')] });
    expect(service.canEdit(u, event({ clubId: 'x' }))).toBe(true);
    expect(service.canEdit(u, event({ clubId: 'y' }))).toBe(false);
  });

  it('admin can edit any event', () => {
    expect(service.canEdit(admin(), event())).toBe(true);
    expect(
      service.canEdit(
        admin(),
        event({ scope: ScopeType.SECTION, clubId: null, targetSectionIds: ['it-a'] })
      )
    ).toBe(true);
  });

  it('a section event needs the right for every target section', () => {
    const u = user({ assignments: [crRole('it-a')] });
    const one = event({ scope: ScopeType.SECTION, clubId: null, targetSectionIds: ['it-a'] });
    const two = event({
      scope: ScopeType.SECTION,
      clubId: null,
      targetSectionIds: ['it-a', 'it-b'],
    });
    expect(service.canEdit(u, one)).toBe(true);
    expect(service.canEdit(u, two)).toBe(false);
  });

  it('a plain student cannot edit someone else’s event', () => {
    expect(service.canEdit(user(), event())).toBe(false);
  });
});

describe('PermissionService management rights', () => {
  it('admin can manage roles and registry, a student cannot', () => {
    expect(service.canManageRoles(admin())).toBe(true);
    expect(service.canManageRegistry(admin())).toBe(true);
    expect(service.canManageRoles(user())).toBe(false);
    expect(service.canManageRegistry(user())).toBe(false);
  });

  it('a student who holds a campus-scoped position with MANAGE_ROLES can manage roles', () => {
    const campus: AuthAssignment = {
      assignmentId: 'a-campus',
      positionId: 'p-admin',
      positionName: 'Admin',
      scopeType: ScopeType.CAMPUS,
      permissions: [Permission.MANAGE_ROLES],
      clubId: null,
      sectionId: null,
      endsOn: null,
    };
    expect(service.canManageRoles(user({ assignments: [campus] }))).toBe(true);
    expect(service.canManageRegistry(user({ assignments: [campus] }))).toBe(false);
  });
});

describe('PermissionService.listPermissions', () => {
  it('returns the distinct union across assignments', () => {
    const u = user({ assignments: [clubRole('x'), clubRole('y'), crRole('it-a')] });
    expect(service.listPermissions(u)).toEqual(
      [
        Permission.CREATE_CLUB_EVENT,
        Permission.CREATE_SECTION_EVENT,
        Permission.EDIT_ANY_IN_SCOPE,
        Permission.REQUEST_CAMPUS_EVENT,
      ].sort()
    );
  });

  it('includes the implicit admin permissions', () => {
    expect(service.listPermissions(admin())).toContain(Permission.MANAGE_ROLES);
  });
});

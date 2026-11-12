import { ScopeType } from '@senoom/shared';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/domain/DomainError';
import { RoleAssignment } from '../../src/domain/RoleAssignment';
import {
  assign,
  clubMember,
  cr,
  FUTURE,
  makeClub,
  makeSection,
  PAST,
  secretary,
} from './factories';

describe('RoleAssignment', () => {
  const coding = makeClub('coding');
  const now = new Date('2026-11-11T00:00:00Z');

  it('is active when endsOn is null', () => {
    expect(assign(secretary, { club: coding }).isActive(now)).toBe(true);
  });

  it('is active before endsOn, inactive at and after it', () => {
    const a = assign(secretary, { club: coding }, now);
    expect(a.isActive(new Date(now.getTime() - 1))).toBe(true);
    expect(a.isActive(now)).toBe(false);
    expect(a.isActive(new Date(now.getTime() + 1))).toBe(false);
  });

  it('rejects a club position without a club', () => {
    expect(() => assign(secretary)).toThrow(DomainError);
  });

  it('rejects a section on a club position', () => {
    expect(() => assign(secretary, { club: coding, section: makeSection('x') })).toThrow(
      DomainError
    );
  });

  it('rejects a club on a section position', () => {
    expect(() => assign(cr, { club: coding })).toThrow(DomainError);
  });

  it('covers only the same club', () => {
    const a = assign(secretary, { club: coding });
    expect(a.coversTarget({ scopeType: ScopeType.CLUB, clubId: 'coding' })).toBe(true);
    expect(a.coversTarget({ scopeType: ScopeType.CLUB, clubId: 'music' })).toBe(false);
    expect(a.coversTarget({ scopeType: ScopeType.CAMPUS })).toBe(false);
  });

  it('covers only the same section, by id', () => {
    const a = assign(cr, { section: makeSection('it-a-2') });
    expect(a.coversTarget({ scopeType: ScopeType.SECTION, sectionId: 'it-a-2' })).toBe(true);
    expect(a.coversTarget({ scopeType: ScopeType.SECTION, sectionId: 'it-b-2' })).toBe(false);
  });

  it('end() sets endsOn once and rejects a second revoke', () => {
    const a = assign(clubMember, { club: coding }, FUTURE);
    a.end(now);
    expect(a.endsOn).toEqual(now);
    expect(() => a.end(new Date(now.getTime() + 1000))).toThrow(DomainError);
  });

  it('is a RoleAssignment instance with its assigned date kept', () => {
    const a = assign(clubMember, { club: coding });
    expect(a).toBeInstanceOf(RoleAssignment);
    expect(a.assignedOn).toEqual(PAST);
  });
});

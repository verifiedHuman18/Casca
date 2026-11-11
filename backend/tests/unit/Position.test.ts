// Position.test.ts
import { Permission, ScopeType } from '@senoom/shared';
import { describe, expect, it } from 'vitest';
import { Position } from '../../src/domain/Position';

describe('Position', () => {
  it('allows only its own permissions', () => {
    const p = new Position('1', 'Secretary', ScopeType.CLUB, [Permission.CREATE_CLUB_EVENT]);
    expect(p.allows(Permission.CREATE_CLUB_EVENT)).toBe(true);
    expect(p.allows(Permission.MANAGE_ROLES)).toBe(false);
  });
  it('rejects a club position carrying a section permission', () => {
    expect(
      () => new Position('1', 'Bad', ScopeType.CLUB, [Permission.CREATE_SECTION_EVENT])
    ).toThrow();
  });
  it('allows an empty permission set (Club Member)', () => {
    expect(new Position('1', 'Club Member', ScopeType.CLUB, []).permissions.size).toBe(0);
  });
});

import { DomainError } from './DomainError';
import type { RoleAssignment } from './RoleAssignment';

export class Club {
  private _name: string;
  private _description: string;

  constructor(
    private readonly _clubId: string,
    name: string,
    description: string,
    /** Assignments for this club, loaded by the repository. Members are derived, not stored. */
    private readonly assignments: RoleAssignment[] = []
  ) {
    this._name = Club.cleanName(name);
    this._description = description.trim();
  }

  get clubId(): string {
    return this._clubId;
  }
  get name(): string {
    return this._name;
  }
  get description(): string {
    return this._description;
  }

  rename(name: string): void {
    this._name = Club.cleanName(name);
  }

  describe(description: string): void {
    this._description = description.trim();
  }

  private static cleanName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      throw new DomainError('INVALID_CLUB', 'Club name must be 1 to 100 characters');
    }
    return trimmed;
  }

  /** Distinct student ids with an active assignment here, Club Member included. */
  getMembers(now: Date = new Date()): string[] {
    const ids = this.assignments.filter(a => a.isActive(now)).map(a => a.studentId);
    return [...new Set(ids)];
  }

  /** Active assignments whose position grants at least one permission. */
  getOfficeBearers(now: Date = new Date()): RoleAssignment[] {
    return this.assignments.filter(a => a.isActive(now) && a.position.permissions.size > 0);
  }
}

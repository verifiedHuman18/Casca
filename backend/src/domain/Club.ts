import type { RoleAssignment } from './RoleAssignment';

export class Club {
  constructor(
    private readonly _clubId: string,
    private _name: string,
    private _description: string,
    /** Assignments for this club, loaded by the repository. Members are derived, not stored. */
    private readonly assignments: RoleAssignment[] = []
  ) {}

  get clubId(): string {
    return this._clubId;
  }
  get name(): string {
    return this._name;
  }
  get description(): string {
    return this._description;
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

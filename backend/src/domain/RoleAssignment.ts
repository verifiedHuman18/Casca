import { ScopeTarget, ScopeType } from '@senoom/shared';
import { Club } from './Club';
import { DomainError } from './DomainError';
import { Position } from './Position';
import { Section } from './Section';

export class RoleAssignment {
  private _endsOn: Date | null;

  constructor(
    private readonly _id: string,
    private readonly _studentId: string,
    private readonly _position: Position,
    private readonly _club: Club | null,
    private readonly _section: Section | null,
    private readonly _assignedBy: string,
    private readonly _assignedOn: Date,
    endsOn: Date | null = null
  ) {
    const scope = _position.scopeType;
    if (scope === ScopeType.CLUB && (!_club || _section)) {
      throw new DomainError('SCOPE_MISMATCH', 'A club position needs a club and no section');
    }
    if (scope === ScopeType.SECTION && (!_section || _club)) {
      throw new DomainError('SCOPE_MISMATCH', 'A section position needs a section and no club');
    }
    if (scope === ScopeType.CAMPUS && (_club || _section)) {
      throw new DomainError('SCOPE_MISMATCH', 'A campus position takes neither club nor section');
    }
    this._endsOn = endsOn;
  }

  get id(): string {
    return this._id;
  }
  get studentId(): string {
    return this._studentId;
  }
  get position(): Position {
    return this._position;
  }
  get club(): Club | null {
    return this._club;
  }
  get section(): Section | null {
    return this._section;
  }
  get assignedBy(): string {
    return this._assignedBy;
  }
  get assignedOn(): Date {
    return this._assignedOn;
  }
  get endsOn(): Date | null {
    return this._endsOn;
  }

  /** Active means endsOn is null or in the future. */
  isActive(now: Date = new Date()): boolean {
    return this._endsOn === null || this._endsOn.getTime() > now.getTime();
  }

  /** Does this assignment apply to the scope being asked about? */
  coversTarget(target: ScopeTarget): boolean {
    if (this._position.scopeType !== target.scopeType) return false;
    switch (target.scopeType) {
      case ScopeType.CAMPUS:
        return true;
      case ScopeType.CLUB:
        return this._club?.clubId === target.clubId;
      case ScopeType.SECTION:
        return this._section?.sectionId === target.sectionId;
    }
  }

  /** The only allowed change after creation: ending the assignment (revoke). */
  end(at: Date = new Date()): void {
    if (!this.isActive(at)) {
      throw new DomainError('ALREADY_ENDED', 'This assignment has already ended');
    }
    this._endsOn = at;
  }
}

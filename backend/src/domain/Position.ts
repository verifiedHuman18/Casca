import { Permission, ScopeType } from '@senoom/shared';
import { DomainError } from './DomainError';

const ALLOWED: Record<ScopeType, ReadonlySet<Permission>> = {
  [ScopeType.CAMPUS]: new Set(Object.values(Permission)),
  [ScopeType.CLUB]: new Set([
    Permission.CREATE_CLUB_EVENT,
    Permission.REQUEST_CAMPUS_EVENT,
    Permission.EDIT_ANY_IN_SCOPE,
  ]),
  [ScopeType.SECTION]: new Set([Permission.CREATE_SECTION_EVENT, Permission.EDIT_ANY_IN_SCOPE]),
};

export class Position {
  private readonly _permissions: ReadonlySet<Permission>;

  constructor(
    private readonly _positionId: string,
    private _name: string,
    private readonly _scopeType: ScopeType,
    permissions: Iterable<Permission>
  ) {
    if (!_name.trim()) {
      throw new DomainError('INVALID_POSITION', 'Position needs a name');
    }
    const set = new Set(permissions);
    for (const p of set) {
      if (!ALLOWED[_scopeType].has(p)) {
        throw new DomainError('INVALID_POSITION', `${p} is not valid for a ${_scopeType} position`);
      }
    }
    this._permissions = set;
  }

  get positionId(): string {
    return this._positionId;
  }
  get name(): string {
    return this._name;
  }
  get scopeType(): ScopeType {
    return this._scopeType;
  }
  get permissions(): ReadonlySet<Permission> {
    return this._permissions;
  }

  allows(permission: Permission): boolean {
    return this._permissions.has(permission);
  }
}

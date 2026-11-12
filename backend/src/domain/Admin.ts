import { UserType } from '@senoom/shared';
import { DomainError } from './DomainError';
import { User, UserProps } from './User';

export class Admin extends User {
  private readonly _adminLevel: number;

  constructor(props: UserProps & { adminLevel?: number }) {
    super(props);
    const level = props.adminLevel ?? 1;
    if (!Number.isInteger(level) || level < 1) {
      throw new DomainError('INVALID_ADMIN', 'Admin level must be a positive integer');
    }
    this._adminLevel = level;
  }

  get type(): UserType {
    return UserType.ADMIN;
  }
  get adminLevel(): number {
    return this._adminLevel;
  }
  // No powers here: they come from PermissionService.
}

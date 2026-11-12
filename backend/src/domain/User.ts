import { UserType } from '@senoom/shared';
import { DomainError } from './DomainError';

/** What a User needs from a hasher. PasswordHasher satisfies this. */
export interface PasswordCheck {
  verify(plain: string, hash: string): Promise<boolean>;
  hash(plain: string): Promise<string>;
  validate(plain: string): string | null;
}

export interface UserProps {
  userId: string;
  name: string;
  email: string | null;
  passwordHash: string;
}

export abstract class User {
  private readonly _userId: string;
  private _name: string;
  private readonly _email: string | null;
  private _passwordHash: string;

  protected constructor(props: UserProps) {
    this._userId = props.userId;
    this._name = User.cleanName(props.name);
    this._email = props.email;
    this._passwordHash = props.passwordHash;
  }

  abstract get type(): UserType;

  get userId(): string {
    return this._userId;
  }
  get name(): string {
    return this._name;
  }
  get email(): string | null {
    return this._email;
  }

  rename(name: string): void {
    this._name = User.cleanName(name);
  }

  private static cleanName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      throw new DomainError('INVALID_NAME', 'Name must be 1 to 100 characters');
    }
    return trimmed;
  }

  login(plain: string, passwords: PasswordCheck): Promise<boolean> {
    return passwords.verify(plain, this._passwordHash);
  }

  /** Tokens are stateless, so there is nothing to do on the server. The client drops its token. */
  logout(): void {
    // intentionally empty
  }

  async changePassword(current: string, next: string, passwords: PasswordCheck): Promise<void> {
    if (!(await passwords.verify(current, this._passwordHash))) {
      throw new DomainError('WRONG_PASSWORD', 'Current password is incorrect');
    }
    const problem = passwords.validate(next);
    if (problem) {
      throw new DomainError('INVALID_PASSWORD', problem);
    }
    this._passwordHash = await passwords.hash(next);
  }

  /** For repositories only. Never put this in a response or a log. */
  getPasswordHashForPersistence(): string {
    return this._passwordHash;
  }
}

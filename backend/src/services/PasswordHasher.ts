import bcrypt from 'bcrypt';

const COST = 12;
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently ignores everything after 72 bytes, so cap the input.
export const MAX_PASSWORD_BYTES = 72;

export class PasswordHasher {
  /** Returns an error message, or null if the password is acceptable. */
  validate(plain: string): string | null {
    if (plain.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES) {
      return `Password must be at most ${MAX_PASSWORD_BYTES} bytes`;
    }
    return null;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  /** Constant-time comparison done by bcrypt. */
  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

import 'dotenv/config';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresInSeconds: number;
}

const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRY_SECONDS = 12 * 60 * 60;

/**
 * Read lazily (not at import time) so scripts such as db:migrate and db:seed keep
 * working on machines that have no JWT_SECRET yet.
 */
export function loadAuthConfig(source: NodeJS.ProcessEnv = process.env): AuthConfig {
  const jwtSecret = source.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`);
  }
  const raw = source.JWT_EXPIRES_IN_SECONDS;
  const jwtExpiresInSeconds = raw ? Number.parseInt(raw, 10) : DEFAULT_EXPIRY_SECONDS;
  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }
  return { jwtSecret, jwtExpiresInSeconds };
}

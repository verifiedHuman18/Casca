import type { AuthUser } from '@senoom/shared';
import type { Request, RequestHandler } from 'express';
import { DomainError } from '../domain/DomainError';
import type { AuthService } from '../services/AuthService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth. Built from the database on every request, never from the token. */
      user?: AuthUser;
    }
  }
}

const BEARER = /^Bearer (\S+)$/i;

/** 401 when there is no valid token or the account is gone. Pass the result to routes. */
export function createRequireAuth(authService: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const match = BEARER.exec(req.headers.authorization ?? '');
    if (!match) {
      throw new DomainError('UNAUTHENTICATED', 'Missing or malformed Authorization header');
    }
    req.user = await authService.authenticate(match[1]);
    next();
  };
}

/** The caller of a route that runs after requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new DomainError('UNAUTHENTICATED', 'Not logged in');
  return req.user;
}

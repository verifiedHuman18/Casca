import type { AuthUser } from '@senoom/shared';
import type { Request, RequestHandler } from 'express';
import { DomainError } from '../domain/DomainError';
import { currentUser } from './requireAuth';

/**
 * 403 unless `check` allows the caller. The decision itself always comes from
 * PermissionService, for example:
 *   requirePermission(user => permissions.canManageRegistry(user))
 * Run it after requireAuth.
 */
export function requirePermission(
  check: (user: AuthUser, req: Request) => boolean
): RequestHandler {
  return (req, _res, next) => {
    if (!check(currentUser(req), req)) {
      throw new DomainError('FORBIDDEN', 'You are not allowed to do this');
    }
    next();
  };
}

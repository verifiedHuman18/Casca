import { NextFunction, Request, Response } from 'express';
import { UserType } from '@senoom/shared';
import type { AuthUser } from '@senoom/shared';
import { DomainError } from '../../domain/DomainError';
import type { EventActor } from '../domain/event.types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function requireActor(req: AuthenticatedRequest): EventActor {
  const user = req.user;

  if (!user?.userId) {
    throw new DomainError('UNAUTHENTICATED', 'Authentication required.');
  }

  return {
    userId: user.userId,
    sectionId: user.sectionId,
    clubMembershipIds: user.clubIds,
    isAdmin: user.type === UserType.ADMIN,
    authUser: user,
  };
}

/** Express 5 types route params as string | string[]; :eventId is always a single UUID. */
export function eventIdOf(req: Request): string {
  const id = req.params.eventId;
  return Array.isArray(id) ? id[0] : id;
}

export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
}

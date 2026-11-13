import { NextFunction, Request, Response } from 'express';
import { UserType } from '@senoom/shared';
import type { AuthUser } from '@senoom/shared';
import { EventActor, DomainError } from '../domain/event.types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function requireActor(req: AuthenticatedRequest): EventActor {
  const user = req.user;

  if (!user?.userId) {
    throw new DomainError('Authentication required.', 'UNAUTHENTICATED', 401);
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

export function eventErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  // Do not leak SQL errors or stack traces to clients.
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}

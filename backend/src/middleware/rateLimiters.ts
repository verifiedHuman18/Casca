import type { ApiErrorBody } from '@senoom/shared';
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export interface LimiterSettings {
  windowMs: number;
  signupPerIp: number;
  loginPerIp: number;
  loginPerAccount: number;
}

export interface AuthLimiters {
  signup: RequestHandler;
  loginByIp: RequestHandler;
  loginByAccount: RequestHandler;
}

export const DEFAULT_LIMITS: LimiterSettings = {
  windowMs: 15 * 60 * 1000,
  signupPerIp: 20,
  loginPerIp: 30,
  loginPerAccount: 10,
};

const TOO_MANY: ApiErrorBody = {
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' },
};

function limiter(
  windowMs: number,
  limit: number,
  extra: { skipSuccessfulRequests?: boolean; keyGenerator?: (req: Request) => string } = {}
): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: TOO_MANY,
    ...extra,
  });
}

/** Which account a login attempt is about: its enrollment number or its email. */
function accountKey(req: Request): string {
  const body = (req.body ?? {}) as { enrollmentNo?: unknown; email?: unknown };
  const raw = body.enrollmentNo ?? body.email;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : 'unknown';
}

/**
 * Only failed logins count towards the login limits. Per-account limiting means someone can
 * lock a known enrollment number out for one window; that is the accepted trade-off.
 */
export function createAuthLimiters(settings: LimiterSettings = DEFAULT_LIMITS): AuthLimiters {
  return {
    signup: limiter(settings.windowMs, settings.signupPerIp),
    loginByIp: limiter(settings.windowMs, settings.loginPerIp, { skipSuccessfulRequests: true }),
    loginByAccount: limiter(settings.windowMs, settings.loginPerAccount, {
      skipSuccessfulRequests: true,
      keyGenerator: accountKey,
    }),
  };
}

import type { ApiErrorBody } from '@senoom/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../domain/DomainError';

const STATUS_BY_CODE: Record<string, number> = {
  AUTH_CONTEXT_MISSING: 500,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  WRONG_PASSWORD: 401,
  FORBIDDEN: 403,
  SELF_APPROVAL: 403,
  NOT_FOUND: 404,
  INVALID_EVENT_STATE: 409,
  VALIDATION_ERROR: 400,
  SECTION_NOT_FOUND: 404,
  ENROLLMENT_EXISTS: 409,
  EMAIL_EXISTS: 409,
  CLUB_EXISTS: 409,
  POSITION_EXISTS: 409,
  DUPLICATE_ASSIGNMENT: 409,
  ALREADY_ENDED: 409,
  SCOPE_MISMATCH: 422,
};

/** INVALID_* codes are bad input (400). Any other unlisted domain rule is a 422. */
function statusFor(code: string): number {
  if (STATUS_BY_CODE[code]) return STATUS_BY_CODE[code];
  return code.startsWith('INVALID_') ? 400 : 422;
}

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Route not found'));
};

/** The one place that turns errors into responses. Never leaks internals or secrets. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ZodError) {
    const details = err.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    res.status(400).json(body('VALIDATION_ERROR', 'The request is not valid', details));
    return;
  }
  if (err instanceof DomainError) {
    res.status(statusFor(err.code)).json(body(err.code, err.message));
    return;
  }
  // Errors raised by Express itself, such as malformed JSON or a body that is too large.
  const http = err as { type?: string; status?: number };
  if (http.type === 'entity.parse.failed') {
    res.status(400).json(body('INVALID_JSON', 'Request body is not valid JSON'));
    return;
  }
  if (http.type === 'entity.too.large') {
    res.status(413).json(body('PAYLOAD_TOO_LARGE', 'Request body is too large'));
    return;
  }
  console.error('Unhandled error:', err instanceof Error ? err.stack : err);
  res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong'));
};

import type { AuthUser } from './auth';

/** Every error response from the API has this shape. */
export interface ApiErrorBody {
  error: {
    /** Stable machine-readable code, e.g. ENROLLMENT_EXISTS. */
    code: string;
    message: string;
    /** Validation problems: [{ path, message }]. Absent for other errors. */
    details?: unknown;
  };
}

/** Response of POST /api/auth/signup (201) and POST /api/auth/login (200). */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

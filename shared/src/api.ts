import type { AuthUser } from './auth';
import type { Permission, ScopeType } from './index';
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

/** Response shapes of the registry routes. Never contain password hashes or emails. */
export interface SectionDto {
  sectionId: string;
  course: string;
  label: string;
  year: number;
  /** Display name, e.g. "IT-A (Year 2)". */
  name: string;
}

export interface ClubDto {
  clubId: string;
  name: string;
  description: string;
}

export interface OfficeBearerDto {
  studentId: string;
  name: string;
  positionName: string;
}

export interface ClubDetailDto extends ClubDto {
  officeBearers: OfficeBearerDto[];
}

/** Other students see only name and section. */
export interface ClubMemberDto {
  studentId: string;
  name: string;
  sectionName: string;
}

export interface PositionDto {
  positionId: string;
  name: string;
  scopeType: ScopeType;
  permissions: Permission[];
}

/** Admin view of a student. */
export interface StudentDto {
  userId: string;
  name: string;
  enrollmentNo: string;
  course: string;
  year: number;
  section: SectionDto;
}

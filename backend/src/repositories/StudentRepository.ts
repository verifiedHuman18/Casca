import type { Student } from '../domain/Student';

/** Lookups return active accounts only. Soft-deleted students are hidden. */
export interface StudentRepository {
  findById(userId: string): Promise<Student | null>;
  findByEnrollmentNo(enrollmentNo: string): Promise<Student | null>;
  search(enrollmentPrefix: string, limit: number, offset: number): Promise<Student[]>;
  /** Includes soft-deleted accounts, because the unique constraint still applies to them. */
  existsByEnrollmentNo(enrollmentNo: string): Promise<boolean>;
  /** Inserts the users and students rows in one transaction. */
  create(student: Student): Promise<void>;
  /** Persists name, section and password hash. Enrollment number never changes. */
  update(student: Student): Promise<void>;
  /** Soft delete: sets is_active to false. */
  deactivate(userId: string): Promise<void>;
}

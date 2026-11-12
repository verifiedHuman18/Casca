import type { Admin } from '../domain/Admin';

export interface AdminRepository {
  findById(userId: string): Promise<Admin | null>;
  findByEmail(email: string): Promise<Admin | null>;
  /** Persists name and password hash. */
  update(admin: Admin): Promise<void>;
}

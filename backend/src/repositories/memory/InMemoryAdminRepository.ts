import type { Admin } from '../../domain/Admin';
import { DomainError } from '../../domain/DomainError';
import type { AdminRepository } from '../AdminRepository';

export class InMemoryAdminRepository implements AdminRepository {
  private readonly byId = new Map<string, Admin>();

  constructor(admins: Admin[] = []) {
    admins.forEach(a => this.byId.set(a.userId, a));
  }

  findById(userId: string): Promise<Admin | null> {
    return Promise.resolve(this.byId.get(userId) ?? null);
  }

  findByEmail(email: string): Promise<Admin | null> {
    const wanted = email.toLowerCase();
    return Promise.resolve(
      [...this.byId.values()].find(a => a.email?.toLowerCase() === wanted) ?? null
    );
  }

  update(admin: Admin): Promise<void> {
    if (!this.byId.has(admin.userId)) {
      return Promise.reject(new DomainError('NOT_FOUND', 'Admin not found'));
    }
    this.byId.set(admin.userId, admin);
    return Promise.resolve();
  }
}

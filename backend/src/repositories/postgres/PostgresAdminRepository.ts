import type { Pool } from 'pg';
import { DomainError } from '../../domain/DomainError';
import type { Admin } from '../../domain/Admin';
import type { AdminRepository } from '../AdminRepository';
import { rowToAdmin, type AdminRow } from './mappers';

const SELECT = `
  SELECT user_id, name, email, password_hash
  FROM users
  WHERE user_type = 'ADMIN' AND is_active`;

export class PostgresAdminRepository implements AdminRepository {
  constructor(private readonly pool: Pool) {}

  async findById(userId: string): Promise<Admin | null> {
    const res = await this.pool.query<AdminRow>(`${SELECT} AND user_id = $1`, [userId]);
    return res.rows[0] ? rowToAdmin(res.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const res = await this.pool.query<AdminRow>(`${SELECT} AND lower(email) = lower($1)`, [email]);
    return res.rows[0] ? rowToAdmin(res.rows[0]) : null;
  }

  async update(admin: Admin): Promise<void> {
    const res = await this.pool.query(
      `UPDATE users SET name = $2, password_hash = $3 WHERE user_id = $1 AND user_type = 'ADMIN'`,
      [admin.userId, admin.name, admin.getPasswordHashForPersistence()]
    );
    if (res.rowCount === 0) {
      throw new DomainError('NOT_FOUND', 'Admin not found');
    }
  }
}

import type { Pool, PoolClient } from 'pg';
import { isUniqueViolation } from '../../db/errors';
import { withTransaction } from '../../db/transaction';
import { DomainError } from '../../domain/DomainError';
import type { Position } from '../../domain/Position';
import type { PositionRepository } from '../PositionRepository';
import { rowToPosition, type PositionRow } from './mappers';

const SELECT = `
  SELECT p.position_id, p.name, p.scope_type,
         COALESCE(array_agg(pp.permission) FILTER (WHERE pp.permission IS NOT NULL), '{}') AS permissions
  FROM positions p
  LEFT JOIN position_permissions pp ON pp.position_id = p.position_id`;

export class PostgresPositionRepository implements PositionRepository {
  constructor(private readonly pool: Pool) {}

  async findById(positionId: string): Promise<Position | null> {
    const res = await this.pool.query<PositionRow>(
      `${SELECT} WHERE p.position_id = $1 GROUP BY p.position_id`,
      [positionId]
    );
    return res.rows[0] ? rowToPosition(res.rows[0]) : null;
  }

  async findByName(name: string): Promise<Position | null> {
    const res = await this.pool.query<PositionRow>(
      `${SELECT} WHERE p.name = $1 GROUP BY p.position_id`,
      [name]
    );
    return res.rows[0] ? rowToPosition(res.rows[0]) : null;
  }

  async findAll(): Promise<Position[]> {
    const res = await this.pool.query<PositionRow>(
      `${SELECT} GROUP BY p.position_id ORDER BY p.name`
    );
    return res.rows.map(rowToPosition);
  }

  async add(position: Position): Promise<void> {
    try {
      await withTransaction(this.pool, async client => {
        await client.query(
          'INSERT INTO positions (position_id, name, scope_type) VALUES ($1, $2, $3)',
          [position.positionId, position.name, position.scopeType]
        );
        await this.insertPermissions(client, position);
      });
    } catch (err) {
      throw this.translate(err);
    }
  }

  async update(position: Position): Promise<void> {
    try {
      await withTransaction(this.pool, async client => {
        const res = await client.query(
          'UPDATE positions SET name = $2, scope_type = $3 WHERE position_id = $1',
          [position.positionId, position.name, position.scopeType]
        );
        if (res.rowCount === 0) {
          throw new DomainError('NOT_FOUND', 'Position not found');
        }
        await client.query('DELETE FROM position_permissions WHERE position_id = $1', [
          position.positionId,
        ]);
        await this.insertPermissions(client, position);
      });
    } catch (err) {
      throw this.translate(err);
    }
  }

  private async insertPermissions(client: PoolClient, position: Position): Promise<void> {
    for (const permission of position.permissions) {
      await client.query(
        'INSERT INTO position_permissions (position_id, permission) VALUES ($1, $2)',
        [position.positionId, permission]
      );
    }
  }

  private translate(err: unknown): unknown {
    return isUniqueViolation(err)
      ? new DomainError('POSITION_EXISTS', 'A position with this name already exists')
      : err;
  }
}

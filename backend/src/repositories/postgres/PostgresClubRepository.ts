import type { Pool } from 'pg';
import { isUniqueViolation } from '../../db/errors';
import { Club } from '../../domain/Club';
import { DomainError } from '../../domain/DomainError';
import type { RoleAssignment } from '../../domain/RoleAssignment';
import type { ClubRepository } from '../ClubRepository';
import { ASSIGNMENT_SELECT } from './assignmentSql';
import { rowToAssignment, type AssignmentRow, type ClubRow } from './mappers';

export class PostgresClubRepository implements ClubRepository {
  constructor(private readonly pool: Pool) {}

  async findById(clubId: string): Promise<Club | null> {
    const res = await this.pool.query<ClubRow>(
      'SELECT club_id, name, description FROM clubs WHERE club_id = $1',
      [clubId]
    );
    return (await this.load(res.rows))[0] ?? null;
  }

  async findAll(): Promise<Club[]> {
    const res = await this.pool.query<ClubRow>(
      'SELECT club_id, name, description FROM clubs ORDER BY name'
    );
    return this.load(res.rows);
  }

  async add(club: Club): Promise<void> {
    try {
      await this.pool.query('INSERT INTO clubs (club_id, name, description) VALUES ($1, $2, $3)', [
        club.clubId,
        club.name,
        club.description,
      ]);
    } catch (err) {
      throw this.translate(err);
    }
  }

  async update(club: Club): Promise<void> {
    try {
      const res = await this.pool.query(
        'UPDATE clubs SET name = $2, description = $3 WHERE club_id = $1',
        [club.clubId, club.name, club.description]
      );
      if (res.rowCount === 0) {
        throw new DomainError('NOT_FOUND', 'Club not found');
      }
    } catch (err) {
      throw this.translate(err);
    }
  }

  /**
   * Builds each Club with an empty assignment list, then fills the lists from one query.
   * Club and RoleAssignment refer to each other, so the list is created first and filled after.
   */
  private async load(rows: ClubRow[]): Promise<Club[]> {
    if (rows.length === 0) return [];
    const lists = new Map<string, RoleAssignment[]>();
    const clubs = new Map<string, Club>();
    for (const row of rows) {
      const list: RoleAssignment[] = [];
      lists.set(row.club_id, list);
      clubs.set(row.club_id, new Club(row.club_id, row.name, row.description, list));
    }
    const res = await this.pool.query<AssignmentRow>(
      `${ASSIGNMENT_SELECT}
       WHERE ra.club_id = ANY($1::uuid[]) AND (ra.ends_on IS NULL OR ra.ends_on > $2)`,
      [[...clubs.keys()], new Date()]
    );
    for (const row of res.rows) {
      const club = row.club_id ? clubs.get(row.club_id) : undefined;
      if (club && row.club_id) {
        lists.get(row.club_id)?.push(rowToAssignment(row, club));
      }
    }
    return rows.map(row => clubs.get(row.club_id) as Club);
  }

  private translate(err: unknown): unknown {
    return isUniqueViolation(err)
      ? new DomainError('CLUB_EXISTS', 'A club with this name already exists')
      : err;
  }
}

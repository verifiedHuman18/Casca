import { Pool, PoolClient } from 'pg';
import { Event } from '../domain/Event';
import { CampusEvent, ClubEvent, SectionEvent } from '../domain';
import { ClubVisibility, EventScope, EventStatus } from '../domain/event.enums';
import { EventProps, ClashWarning } from '../domain/event.types';
import type { CalendarQuery, EventRepository } from './EventRepository';

type DbRow = {
  event_id: string;
  event_type: EventScope;
  title: string;
  description: string;
  venue: string;
  start_time: Date;
  end_time: Date;
  created_by: string;
  created_at: Date;
  status: EventStatus;
  approved_by: string | null;
  decided_on: Date | null;
  decision_note: string | null;
  club_id: string | null;
  club_visibility: ClubVisibility | null;
  target_section_ids?: string[];
};

export class PgEventRepository implements EventRepository {
  constructor(private readonly pool: Pool) {}

  private async hydrate(row: DbRow, client?: PoolClient): Promise<Event> {
    let targetSectionIds = row.target_section_ids ?? [];
    if (row.event_type === EventScope.SECTION && !row.target_section_ids) {
      const db = client ?? this.pool;
      const result = await db.query<{ section_id: string }>(
        'SELECT section_id FROM event_sections WHERE event_id = $1 ORDER BY section_id',
        [row.event_id]
      );
      targetSectionIds = result.rows.map(r => r.section_id);
    }
    const props: EventProps = {
      id: row.event_id,
      title: row.title,
      description: row.description,
      venue: row.venue,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      status: row.status,
      approvedBy: row.approved_by,
      decidedOn: row.decided_on ? new Date(row.decided_on) : null,
      decisionNote: row.decision_note,
      clubId: row.club_id,
      clubVisibility: row.club_visibility,
      targetSectionIds,
    };
    switch (row.event_type) {
      case EventScope.CAMPUS:
        return new CampusEvent(props);
      case EventScope.CLUB:
        return new ClubEvent(props);
      case EventScope.SECTION:
        return new SectionEvent(props);
    }
  }

  async create(event: Event): Promise<Event> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO events
          (event_id,event_type,title,description,venue,start_time,end_time,created_by,created_at,status,
           approved_by,decided_on,decision_note,club_id,club_visibility)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          event.id,
          event.scope,
          event.title,
          event.description,
          event.venue,
          event.startTime,
          event.endTime,
          event.createdBy,
          event.createdAt,
          event.status,
          event.approvedBy,
          event.decidedOn,
          event.decisionNote,
          event instanceof ClubEvent ? event.clubId : null,
          event instanceof ClubEvent ? event.clubVisibility : null,
        ]
      );
      if (event instanceof SectionEvent) {
        for (const sectionId of event.targetSectionIds) {
          await client.query('INSERT INTO event_sections (event_id, section_id) VALUES ($1,$2)', [
            event.id,
            sectionId,
          ]);
        }
      }
      await client.query('COMMIT');
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(event: Event): Promise<Event> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE events SET title=$2,description=$3,venue=$4,start_time=$5,end_time=$6,status=$7,
          approved_by=$8,decided_on=$9,decision_note=$10,club_visibility=$11
         WHERE event_id=$1`,
        [
          event.id,
          event.title,
          event.description,
          event.venue,
          event.startTime,
          event.endTime,
          event.status,
          event.approvedBy,
          event.decidedOn,
          event.decisionNote,
          event instanceof ClubEvent ? event.clubVisibility : null,
        ]
      );
      if (event instanceof SectionEvent) {
        await client.query('DELETE FROM event_sections WHERE event_id=$1', [event.id]);
        for (const sectionId of event.targetSectionIds) {
          await client.query('INSERT INTO event_sections (event_id,section_id) VALUES ($1,$2)', [
            event.id,
            sectionId,
          ]);
        }
      }
      await client.query('COMMIT');
      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async rows(sql: string, values: unknown[] = []): Promise<Event[]> {
    const result = await this.pool.query<DbRow>(sql, values);
    return Promise.all(result.rows.map(row => this.hydrate(row)));
  }

  async findById(id: string): Promise<Event | null> {
    const events = await this.rows('SELECT * FROM events WHERE event_id=$1', [id]);
    return events[0] ?? null;
  }
  async findAll(): Promise<Event[]> {
    return this.rows('SELECT * FROM events ORDER BY start_time ASC');
  }

  /**
   * Fetch calendar-visible events in one SQL query.
   * Section IDs are aggregated here so hydrate() never issues per-event queries.
   */
  async findForCalendar(query: CalendarQuery): Promise<Event[]> {
    return this.rows(
      `SELECT
         e.*,
         COALESCE(
           array_agg(es.section_id ORDER BY es.section_id)
             FILTER (WHERE es.section_id IS NOT NULL),
           ARRAY[]::text[]
         ) AS target_section_ids
       FROM events e
       LEFT JOIN event_sections es ON es.event_id = e.event_id
       WHERE e.status = 'ACTIVE'
         AND e.start_time >= $1
         AND e.end_time <= $2
         AND (
           e.event_type <> 'CLUB'
           OR cardinality($3::text[]) = 0
           OR e.club_id = ANY($3::text[])
         )
         AND (
           e.event_type <> 'CLUB'
           OR e.club_visibility = 'PUBLIC'
           OR e.club_id = ANY($4::text[])
         )
         AND (
           e.event_type <> 'SECTION'
           OR EXISTS (
             SELECT 1
             FROM event_sections visible_section
             WHERE visible_section.event_id = e.event_id
               AND visible_section.section_id = ANY($5::text[])
           )
         )
       GROUP BY e.event_id
       ORDER BY e.start_time ASC`,
      [query.from, query.to, query.clubIds, query.clubMembershipIds, query.sectionIds]
    );
  }
  async findPendingApproval(): Promise<Event[]> {
    return this.rows(
      "SELECT * FROM events WHERE event_type='CAMPUS' AND status='PENDING_APPROVAL' ORDER BY created_at ASC"
    );
  }
  async findByCreator(userId: string): Promise<Event[]> {
    return this.rows('SELECT * FROM events WHERE created_by=$1 ORDER BY created_at DESC', [userId]);
  }
  async findClashes(
    venue: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<ClashWarning[]> {
    const result = await this.pool.query<{
      event_id: string;
      title: string;
      venue: string;
      start_time: Date;
      end_time: Date;
    }>(
      `SELECT event_id,title,venue,start_time,end_time FROM events
       WHERE lower(trim(venue))=lower(trim($1))
       AND status <> 'CANCELLED'
       AND start_time < $3 AND end_time > $2
       AND ($4::uuid IS NULL OR event_id <> $4::uuid)
       ORDER BY start_time`,
      [venue, startTime, endTime, excludeId ?? null]
    );
    return result.rows.map(r => ({
      eventId: r.event_id,
      title: r.title,
      venue: r.venue,
      startTime: new Date(r.start_time),
      endTime: new Date(r.end_time),
    }));
  }
}

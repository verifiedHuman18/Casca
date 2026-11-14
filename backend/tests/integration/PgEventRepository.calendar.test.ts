import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PgEventRepository } from '../../src/events/repositories/PgEventRepository';
import type { CalendarQuery } from '../../src/events/repositories/EventRepository';
import { createTestPool, hasTestDb, prepareDatabase } from './testDb';

type SeedEvent = {
  type: 'CAMPUS' | 'CLUB' | 'SECTION';
  start: string;
  end: string;
  status?: 'ACTIVE' | 'CANCELLED' | 'PENDING_APPROVAL' | 'REJECTED';
  clubId?: string;
  clubVisibility?: 'PUBLIC' | 'MEMBERS_ONLY';
  sectionIds?: string[];
};

describe.skipIf(!hasTestDb)('PgEventRepository calendar query', () => {
  let pool: Pool;
  let repository: PgEventRepository;
  // Real rows, because the events tables have foreign keys to users, clubs and sections.
  let creatorId: string;
  let publicClub: string;
  let memberClub: string;
  let hiddenClub: string;
  let sectionA: string;
  let sectionB: string;
  let sectionC: string;

  const window: CalendarQuery = {
    from: new Date('2026-12-01T10:00:00Z'),
    to: new Date('2026-12-01T11:00:00Z'),
    clubIds: [],
    clubMembershipIds: [],
    sectionIds: [],
  };

  async function seedEvent(input: SeedEvent): Promise<string> {
    const id = randomUUID();

    await pool.query(
      `INSERT INTO events (
        event_id, event_type, title, description, venue,
        start_time, end_time, created_by, status,
        club_id, club_visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        input.type,
        `Calendar integration ${id}`,
        'Integration test event',
        'Test auditorium',
        input.start,
        input.end,
        creatorId,
        input.status ?? 'ACTIVE',
        input.clubId ?? null,
        input.clubVisibility ?? null,
      ]
    );

    for (const sectionId of input.sectionIds ?? []) {
      await pool.query('INSERT INTO event_sections (event_id, section_id) VALUES ($1, $2)', [
        id,
        sectionId,
      ]);
    }

    return id;
  }

  beforeAll(async () => {
    pool = createTestPool();

    const database = await pool.query<{ name: string }>('SELECT current_database() AS name');

    if (database.rows[0]?.name !== 'casca_test') {
      throw new Error(`Refusing to run destructive tests against "${database.rows[0]?.name}".`);
    }

    // The events tables come from the tracked migrations (003_events_schema.sql).
    await prepareDatabase(pool);

    creatorId = randomUUID();
    await pool.query(
      `INSERT INTO users (user_id, name, email, password_hash, user_type)
       VALUES ($1, 'Calendar Test', $2, 'hash', 'ADMIN')`,
      [creatorId, `calendar-${creatorId}@example.test`]
    );
    const insertClub = async (): Promise<string> => {
      const id = randomUUID();
      await pool.query('INSERT INTO clubs (club_id, name, description) VALUES ($1, $2, $3)', [
        id,
        `Calendar Club ${id}`,
        '',
      ]);
      return id;
    };
    const insertSection = async (): Promise<string> => {
      const id = randomUUID();
      await pool.query(
        'INSERT INTO sections (section_id, course, label, year) VALUES ($1, $2, $3, $4)',
        [id, `CAL-${id}`, 'TEST', 1]
      );
      return id;
    };
    [publicClub, memberClub, hiddenClub] = [
      await insertClub(),
      await insertClub(),
      await insertClub(),
    ];
    [sectionA, sectionB, sectionC] = [
      await insertSection(),
      await insertSection(),
      await insertSection(),
    ];

    repository = new PgEventRepository(pool);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE event_sections, events CASCADE');
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('TRUNCATE TABLE event_sections, events CASCADE');
      await pool.query('DELETE FROM users WHERE user_id = $1', [creatorId]);
      await pool.query('DELETE FROM clubs WHERE club_id = ANY($1::uuid[])', [
        [publicClub, memberClub, hiddenClub],
      ]);
      await pool.query('DELETE FROM sections WHERE section_id = ANY($1::uuid[])', [
        [sectionA, sectionB, sectionC],
      ]);
    }
    await pool?.end();
  });

  it('returns only active events fully contained in the requested date range', async () => {
    const contained = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
    });

    const exactBoundary = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T10:00:00Z',
      end: '2026-12-01T11:00:00Z',
    });

    const startsBefore = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T09:30:00Z',
      end: '2026-12-01T10:30:00Z',
    });

    const endsAfter = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T10:30:00Z',
      end: '2026-12-01T11:30:00Z',
    });

    const cancelled = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T10:15:00Z',
      end: '2026-12-01T10:45:00Z',
      status: 'CANCELLED',
    });

    const events = await repository.findForCalendar(window);
    const ids = events.map(event => event.id);

    expect(ids).toContain(contained);
    expect(ids).toContain(exactBoundary);
    expect(ids).not.toContain(startsBefore);
    expect(ids).not.toContain(endsAfter);
    expect(ids).not.toContain(cancelled);
  });

  it('enforces public and members-only club visibility', async () => {
    const campus = await seedEvent({
      type: 'CAMPUS',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
    });

    const publicClubEvent = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: publicClub,
      clubVisibility: 'PUBLIC',
    });

    const memberClubEvent = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: memberClub,
      clubVisibility: 'MEMBERS_ONLY',
    });

    const hiddenClubEvent = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: hiddenClub,
      clubVisibility: 'MEMBERS_ONLY',
    });

    const events = await repository.findForCalendar({
      ...window,
      clubMembershipIds: [memberClub],
    });

    const ids = events.map(event => event.id);

    expect(ids).toContain(campus);
    expect(ids).toContain(publicClubEvent);
    expect(ids).toContain(memberClubEvent);
    expect(ids).not.toContain(hiddenClubEvent);

    // Explicit club filters affect club events, not campus events.
    const filtered = await repository.findForCalendar({
      ...window,
      clubIds: [publicClub],
      clubMembershipIds: [memberClub],
    });

    const filteredIds = filtered.map(event => event.id);

    expect(filteredIds).toContain(campus);
    expect(filteredIds).toContain(publicClubEvent);
    expect(filteredIds).not.toContain(memberClubEvent);

    // Ids that are not UUIDs match nothing and must not break the query.
    const invalid = await repository.findForCalendar({
      ...window,
      clubIds: ['not-a-uuid'],
      sectionIds: ['also-not-a-uuid'],
    });
    const invalidIds = invalid.map(event => event.id);
    expect(invalidIds).toContain(campus);
    expect(invalidIds).not.toContain(publicClubEvent);
  });

  it('hydrates every target section in one database query', async () => {
    const matching = await seedEvent({
      type: 'SECTION',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      sectionIds: [sectionA, sectionB],
    });

    const notMatching = await seedEvent({
      type: 'SECTION',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      sectionIds: [sectionC],
    });

    const querySpy = vi.spyOn(pool, 'query');

    try {
      const events = await repository.findForCalendar({
        ...window,
        sectionIds: [sectionA],
      });

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(matching);
      const targets = events[0].toJSON().targetSectionIds ?? [];
      expect(targets).toHaveLength(2);
      expect(targets).toEqual(expect.arrayContaining([sectionA, sectionB]));
      expect(events.map(event => event.id)).not.toContain(notMatching);

      // The calendar fetch and section hydration happen in one SQL query.
      expect(querySpy).toHaveBeenCalledTimes(1);
    } finally {
      querySpy.mockRestore();
    }
  });
});

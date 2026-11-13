import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PgEventRepository } from '../../src/events/repositories/PgEventRepository';
import type { CalendarQuery } from '../../src/events/repositories/EventRepository';
import { createTestPool, hasTestDb } from './testDb';

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
        'integration-test-user',
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

    // Temporary setup using the existing Events SQL file.
    // Issue #11 will move this schema into the tracked migration runner.
    const schemaPath = path.resolve(__dirname, '../../sql/001_create_events.sql');
    await pool.query(readFileSync(schemaPath, 'utf8'));

    repository = new PgEventRepository(pool);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE event_sections, events CASCADE');
  });

  afterAll(async () => {
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

    const publicClub = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: 'public-club',
      clubVisibility: 'PUBLIC',
    });

    const memberClub = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: 'member-club',
      clubVisibility: 'MEMBERS_ONLY',
    });

    const hiddenClub = await seedEvent({
      type: 'CLUB',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      clubId: 'hidden-club',
      clubVisibility: 'MEMBERS_ONLY',
    });

    const events = await repository.findForCalendar({
      ...window,
      clubMembershipIds: ['member-club'],
    });

    const ids = events.map(event => event.id);

    expect(ids).toContain(campus);
    expect(ids).toContain(publicClub);
    expect(ids).toContain(memberClub);
    expect(ids).not.toContain(hiddenClub);

    // Explicit club filters affect club events, not campus events.
    const filtered = await repository.findForCalendar({
      ...window,
      clubIds: ['public-club'],
      clubMembershipIds: ['member-club'],
    });

    const filteredIds = filtered.map(event => event.id);

    expect(filteredIds).toContain(campus);
    expect(filteredIds).toContain(publicClub);
    expect(filteredIds).not.toContain(memberClub);
  });

  it('hydrates every target section in one database query', async () => {
    const matching = await seedEvent({
      type: 'SECTION',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      sectionIds: ['IT-A', 'IT-B'],
    });

    const notMatching = await seedEvent({
      type: 'SECTION',
      start: '2026-12-01T10:10:00Z',
      end: '2026-12-01T10:50:00Z',
      sectionIds: ['IT-C'],
    });

    const querySpy = vi.spyOn(pool, 'query');

    try {
      const events = await repository.findForCalendar({
        ...window,
        sectionIds: ['IT-A'],
      });

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(matching);
      expect(events[0].toJSON()).toMatchObject({
        targetSectionIds: ['IT-A', 'IT-B'],
      });
      expect(events.map(event => event.id)).not.toContain(notMatching);

      // The calendar fetch and section hydration happen in one SQL query.
      expect(querySpy).toHaveBeenCalledTimes(1);
    } finally {
      querySpy.mockRestore();
    }
  });
});

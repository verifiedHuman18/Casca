import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPool, hasTestDb, prepareDatabase } from './testDb';

type EventType = 'CAMPUS' | 'CLUB' | 'SECTION';

async function insertUser(pool: Pool): Promise<string> {
  const id = randomUUID();

  await pool.query(
    `INSERT INTO users (user_id, name, email, password_hash, user_type)
     VALUES ($1, 'Events FK Test', $2, 'hash', 'ADMIN')`,
    [id, `events-fk-${id}@example.test`]
  );

  return id;
}

async function insertClub(pool: Pool): Promise<string> {
  const id = randomUUID();

  await pool.query('INSERT INTO clubs (club_id, name, description) VALUES ($1, $2, $3)', [
    id,
    `FK Test Club ${id}`,
    '',
  ]);

  return id;
}

async function insertSection(pool: Pool): Promise<string> {
  const id = randomUUID();

  await pool.query(
    'INSERT INTO sections (section_id, course, label, year) VALUES ($1, $2, $3, $4)',
    [id, `FK-${id}`, 'TEST', 1]
  );

  return id;
}

async function insertEvent(
  pool: Pool,
  options: {
    eventId: string;
    createdBy: string;
    eventType?: EventType;
    clubId?: string | null;
  }
): Promise<void> {
  const eventType = options.eventType ?? 'CAMPUS';
  const start = new Date(Date.now() + 60_000);
  const end = new Date(start.getTime() + 60_000);

  await pool.query(
    `INSERT INTO events (
       event_id, event_type, title, venue, start_time, end_time,
       created_by, status, club_id, club_visibility
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9)`,
    [
      options.eventId,
      eventType,
      `FK Test Event ${options.eventId}`,
      'FK Test Venue',
      start,
      end,
      options.createdBy,
      options.clubId ?? null,
      eventType === 'CLUB' ? 'PUBLIC' : null,
    ]
  );
}

describe.skipIf(!hasTestDb)('Events foreign-key constraints', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();

    const result = await pool.query<{ name: string }>('SELECT current_database() AS name');

    if (result.rows[0]?.name !== 'casca_test') {
      throw new Error(
        `Refusing to run Events foreign-key tests against "${result.rows[0]?.name}".`
      );
    }

    await prepareDatabase(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('rejects an event whose creator does not exist', async () => {
    const eventId = randomUUID();

    try {
      await expect(
        insertEvent(pool, {
          eventId,
          createdBy: randomUUID(),
        })
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
    }
  });

  it('rejects a club event whose club does not exist', async () => {
    const userId = await insertUser(pool);
    const eventId = randomUUID();

    try {
      await expect(
        insertEvent(pool, {
          eventId,
          createdBy: userId,
          eventType: 'CLUB',
          clubId: randomUUID(),
        })
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
  });

  it('rejects an event-section mapping whose section does not exist', async () => {
    const userId = await insertUser(pool);
    const eventId = randomUUID();

    try {
      await insertEvent(pool, {
        eventId,
        createdBy: userId,
        eventType: 'SECTION',
      });

      await expect(
        pool.query('INSERT INTO event_sections (event_id, section_id) VALUES ($1, $2)', [
          eventId,
          randomUUID(),
        ])
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await pool.query('DELETE FROM event_sections WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
  });

  it('restricts deletion of users and clubs referenced by events', async () => {
    const userId = await insertUser(pool);
    const clubId = await insertClub(pool);
    const eventId = randomUUID();

    try {
      await insertEvent(pool, {
        eventId,
        createdBy: userId,
        eventType: 'CLUB',
        clubId,
      });

      await expect(
        pool.query('DELETE FROM users WHERE user_id = $1', [userId])
      ).rejects.toMatchObject({ code: '23503' });

      await expect(
        pool.query('DELETE FROM clubs WHERE club_id = $1', [clubId])
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM clubs WHERE club_id = $1', [clubId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
  });

  it('cascades section deletion to mappings but preserves the event', async () => {
    const userId = await insertUser(pool);
    const sectionId = await insertSection(pool);
    const eventId = randomUUID();

    try {
      await insertEvent(pool, {
        eventId,
        createdBy: userId,
        eventType: 'SECTION',
      });

      await pool.query('INSERT INTO event_sections (event_id, section_id) VALUES ($1, $2)', [
        eventId,
        sectionId,
      ]);

      await pool.query('DELETE FROM sections WHERE section_id = $1', [sectionId]);

      const mapping = await pool.query(
        'SELECT 1 FROM event_sections WHERE event_id = $1 AND section_id = $2',
        [eventId, sectionId]
      );

      const event = await pool.query('SELECT 1 FROM events WHERE event_id = $1', [eventId]);

      expect(mapping.rowCount).toBe(0);
      expect(event.rowCount).toBe(1);
    } finally {
      await pool.query('DELETE FROM event_sections WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
      await pool.query('DELETE FROM sections WHERE section_id = $1', [sectionId]);
      await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
  });
});

import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresSectionRepository } from '../../src/repositories/postgres/PostgresSectionRepository';
import { createTestPool, hasTestDb, prepareDatabase, resetData } from './testDb';

describe.skipIf(!hasTestDb)('PostgresSectionRepository', () => {
  let pool: Pool;
  let repo: PostgresSectionRepository;

  beforeAll(async () => {
    pool = createTestPool();
    await prepareDatabase(pool);
    repo = new PostgresSectionRepository(pool);
  });
  beforeEach(() => resetData(pool));
  afterAll(() => pool.end());

  const insert = (course: string, label: string, year: number) =>
    pool.query(
      'INSERT INTO sections (course, label, year) VALUES ($1, $2, $3) RETURNING section_id',
      [course, label, year]
    );

  it('returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });

  it('maps a row to a Section', async () => {
    const { rows } = await insert('IT-BI', 'C', 2);
    const section = await repo.findById(rows[0].section_id);
    expect(section?.getName()).toBe('IT-BI-C (Year 2)');
    expect(section?.year).toBe(2);
  });

  it('lists sections ordered by course, label and year', async () => {
    await insert('IT-BI', 'C', 2);
    await insert('IT', 'A', 2);
    await insert('IT', 'A', 1);
    const names = (await repo.findAll()).map(s => s.getName());
    expect(names).toEqual(['IT-A (Year 1)', 'IT-A (Year 2)', 'IT-BI-C (Year 2)']);
  });
});

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
  try {
    const sql = await readFile(resolve(__dirname, '../sql/001_create_events.sql'), 'utf8');
    await pool.query(sql);
    process.stdout.write('Events migration applied.\\n');
  } finally {
    await pool.end();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

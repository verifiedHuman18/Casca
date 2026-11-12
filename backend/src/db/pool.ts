import fs from 'node:fs';
import { Pool } from 'pg';
import { env } from '../config/env';

function buildPool(): Pool {
  // Remove sslmode from the URL: pg would let it override our ssl settings
  // and skip the Aiven CA, so TLS is configured explicitly below instead.
  const url = new URL(env.databaseUrl);
  url.searchParams.delete('sslmode');

  let ssl: { ca: string; rejectUnauthorized: true } | false = false;
  if (env.dbSsl) {
    if (!env.dbCaCertPath) {
      throw new Error('DB_SSL is on but DB_CA_CERT_PATH is not set');
    }
    ssl = { ca: fs.readFileSync(env.dbCaCertPath, 'utf8'), rejectUnauthorized: true };
  }

  const pool = new Pool({ connectionString: url.toString(), ssl, max: 5 });
  pool.on('error', err => console.error('Unexpected database pool error', err.message));
  return pool;
}

/** The one shared pool. Repositories receive it through their constructors. */
export const pool = buildPool();

import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { env } from '../config/env';

function buildPool(): Pool {
  // Remove sslmode from the URL: pg would let it override our ssl settings
  // and skip the Aiven CA, so TLS is configured explicitly below instead.
  const url = new URL(env.databaseUrl);
  url.searchParams.delete('sslmode');

  let ssl: { ca: string; rejectUnauthorized: true } | false = false;
  if (env.dbSsl) {
    let caContent: string | undefined = process.env.DB_CA_CERT;
    if (!caContent && env.dbCaCertPath) {
      const candidates = [
        env.dbCaCertPath,
        path.resolve(process.cwd(), env.dbCaCertPath),
        path.resolve(process.cwd(), 'backend', env.dbCaCertPath),
        path.resolve(__dirname, '../../', path.basename(env.dbCaCertPath)),
        path.resolve(__dirname, '../../../', path.basename(env.dbCaCertPath)),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          caContent = fs.readFileSync(candidate, 'utf8');
          break;
        }
      }
    }
    if (!caContent) {
      throw new Error(
        'DB_SSL is on but neither DB_CA_CERT nor a readable DB_CA_CERT_PATH was found'
      );
    }
    ssl = { ca: caContent, rejectUnauthorized: true };
  }

  const pool = new Pool({ connectionString: url.toString(), ssl, max: 5 });
  pool.on('error', err => console.error('Unexpected database pool error', err.message));
  return pool;
}

/** The one shared pool. Repositories receive it through their constructors. */
export const pool = buildPool();

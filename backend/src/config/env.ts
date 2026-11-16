import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from backend/.env or cwd .env
const candidates = [
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: requireEnv('DATABASE_URL'),
  dbSsl: process.env.DB_SSL !== 'false',
  dbCaCertPath: process.env.DB_CA_CERT_PATH,
};

import { Permission, ScopeType, UserType, VALID_SECTIONS_BY_COURSE } from '@senoom/shared';
import { requireEnv } from '../config/env';
import { PasswordHasher } from '../services/PasswordHasher';
import { pool } from './pool';

const YEARS = [1, 2, 3, 4];

const POSITIONS: { name: string; scope: ScopeType; permissions: Permission[] }[] = [
  {
    name: 'Admin',
    scope: ScopeType.CAMPUS,
    permissions: [
      Permission.CREATE_CAMPUS_EVENT,
      Permission.APPROVE_CAMPUS_EVENT,
      Permission.EDIT_ANY_IN_SCOPE,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_REGISTRY,
    ],
  },
  ...['Club President', 'Club Vice-President', 'Club Secretary', 'Club Coordinator'].map(name => ({
    name,
    scope: ScopeType.CLUB,
    permissions: [
      Permission.CREATE_CLUB_EVENT,
      Permission.REQUEST_CAMPUS_EVENT,
      Permission.EDIT_ANY_IN_SCOPE,
    ],
  })),
  { name: 'Club Member', scope: ScopeType.CLUB, permissions: [] },
  {
    name: 'Class Representative',
    scope: ScopeType.SECTION,
    permissions: [Permission.CREATE_SECTION_EVENT, Permission.EDIT_ANY_IN_SCOPE],
  },
];

const CLUBS = ['Coding Club', 'Music Club', 'Dramatics Club'];

async function seed(): Promise<void> {
  const adminName = requireEnv('ADMIN_NAME');
  const adminEmail = requireEnv('ADMIN_EMAIL').trim().toLowerCase();
  const adminPassword = requireEnv('ADMIN_PASSWORD');

  const hasher = new PasswordHasher();
  const problem = hasher.validate(adminPassword);
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);
  const adminHash = await hasher.hash(adminPassword);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [course, labels] of Object.entries(VALID_SECTIONS_BY_COURSE)) {
      for (const label of labels) {
        for (const year of YEARS) {
          await client.query(
            `INSERT INTO sections (course, label, year) VALUES ($1, $2, $3)
             ON CONFLICT (course, label, year) DO NOTHING`,
            [course, label, year]
          );
        }
      }
    }

    for (const pos of POSITIONS) {
      await client.query(
        `INSERT INTO positions (name, scope_type) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [pos.name, pos.scope]
      );
      for (const permission of pos.permissions) {
        await client.query(
          `INSERT INTO position_permissions (position_id, permission)
           SELECT position_id, $2 FROM positions WHERE name = $1
           ON CONFLICT DO NOTHING`,
          [pos.name, permission]
        );
      }
    }

    for (const name of CLUBS) {
      await client.query(`INSERT INTO clubs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [
        name,
      ]);
    }

    const existing = await client.query('SELECT 1 FROM users WHERE lower(email) = $1', [
      adminEmail,
    ]);
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, user_type) VALUES ($1, $2, $3, $4)`,
        [adminName, adminEmail, adminHash, UserType.ADMIN]
      );
    }

    await client.query('COMMIT');
    console.info('Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

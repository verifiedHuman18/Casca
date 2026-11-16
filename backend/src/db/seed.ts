import { randomUUID } from 'node:crypto';
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

    const studentEnrollment = 'IIT2023001';
    const existingStudent = await client.query(
      'SELECT user_id FROM students WHERE enrollment_no = $1',
      [studentEnrollment]
    );
    if (existingStudent.rowCount === 0) {
      const studentUserId = randomUUID();
      const studentHash = await hasher.hash('password123');
      const secRes = await client.query(
        `SELECT section_id FROM sections WHERE course = 'IT' AND label = 'A' AND year = 2 LIMIT 1`
      );
      const sectionId = secRes.rows[0]?.section_id;

      if (sectionId) {
        await client.query(
          `INSERT INTO users (user_id, name, email, password_hash, user_type)
           VALUES ($1, $2, NULL, $3, $4)`,
          [studentUserId, 'Aarav Sharma', studentHash, UserType.STUDENT]
        );
        await client.query(
          `INSERT INTO students (user_id, enrollment_no, course, section_id)
           VALUES ($1, $2, 'IT', $3)`,
          [studentUserId, studentEnrollment, sectionId]
        );

        const adminUserIdRes = await client.query(
          'SELECT user_id FROM users WHERE lower(email) = $1',
          [adminEmail]
        );
        const assignedBy = adminUserIdRes.rows[0]?.user_id ?? studentUserId;

        // Assign Class Representative role
        const crPos = await client.query(
          `SELECT position_id FROM positions WHERE name = 'Class Representative' LIMIT 1`
        );
        if (crPos.rows[0]) {
          await client.query(
            `INSERT INTO role_assignments (id, student_id, position_id, club_id, section_id, assigned_by)
             VALUES ($1, $2, $3, NULL, $4, $5)`,
            [randomUUID(), studentUserId, crPos.rows[0].position_id, sectionId, assignedBy]
          );
        }

        // Assign Club Coordinator role for Coding Club
        const coordPos = await client.query(
          `SELECT position_id FROM positions WHERE name = 'Club Coordinator' LIMIT 1`
        );
        const clubRes = await client.query(
          `SELECT club_id FROM clubs WHERE name = 'Coding Club' LIMIT 1`
        );
        if (coordPos.rows[0] && clubRes.rows[0]) {
          await client.query(
            `INSERT INTO role_assignments (id, student_id, position_id, club_id, section_id, assigned_by)
             VALUES ($1, $2, $3, $4, NULL, $5)`,
            [
              randomUUID(),
              studentUserId,
              coordPos.rows[0].position_id,
              clubRes.rows[0].club_id,
              assignedBy,
            ]
          );
        }
      }
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

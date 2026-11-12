import type { Admin } from '../../src/domain/Admin';
import type { PasswordCheck } from '../../src/domain/User';
import type { AdminRepository } from '../../src/repositories/AdminRepository';
import { InMemoryRoleAssignmentRepository } from '../../src/repositories/memory/InMemoryRoleAssignmentRepository';
import { InMemorySectionRepository } from '../../src/repositories/memory/InMemorySectionRepository';
import { InMemoryStudentRepository } from '../../src/repositories/memory/InMemoryStudentRepository';
import { AuthService } from '../../src/services/AuthService';
import { PasswordHasher } from '../../src/services/PasswordHasher';
import { makeSection } from './factories';

export const SECTION_ID = '11111111-1111-4111-8111-111111111111';
export const SECRET = 'test-secret-test-secret-test-secret-1234';

/** Real validation rules, but no bcrypt, so tests stay fast. */
const rules = new PasswordHasher();
export const fastHasher: PasswordCheck = {
  validate: p => rules.validate(p),
  hash: p => Promise.resolve(`hashed:${p}`),
  verify: (p, h) => Promise.resolve(h === `hashed:${p}`),
};

export class FakeAdminRepository implements AdminRepository {
  constructor(private admins: Admin[] = []) {}
  findById(id: string) {
    return Promise.resolve(this.admins.find(a => a.userId === id) ?? null);
  }
  findByEmail(email: string) {
    const e = email.toLowerCase();
    return Promise.resolve(this.admins.find(a => a.email?.toLowerCase() === e) ?? null);
  }
  update() {
    return Promise.resolve();
  }
}

export function makeAuthKit(admins: Admin[] = [], expiresInSeconds = 3600) {
  const students = new InMemoryStudentRepository();
  const assignments = new InMemoryRoleAssignmentRepository();
  const sections = new InMemorySectionRepository([makeSection(SECTION_ID)]);
  const service = new AuthService(
    {
      students,
      admins: new FakeAdminRepository(admins),
      sections,
      assignments,
      passwords: fastHasher,
    },
    { jwtSecret: SECRET, jwtExpiresInSeconds: expiresInSeconds }
  );
  return { service, students, assignments };
}

export const signUpInput = {
  name: 'Arnav',
  enrollmentNo: 'iit2025257',
  sectionId: SECTION_ID,
  password: 'correct horse',
};

import { Permission, ScopeType } from '@senoom/shared';
import { Admin } from '../../src/domain/Admin';
import { Club } from '../../src/domain/Club';
import { Position } from '../../src/domain/Position';
import { Student } from '../../src/domain/Student';
import { InMemoryClubRepository } from '../../src/repositories/memory/InMemoryClubRepository';
import { InMemoryPositionRepository } from '../../src/repositories/memory/InMemoryPositionRepository';
import { InMemoryRoleAssignmentRepository } from '../../src/repositories/memory/InMemoryRoleAssignmentRepository';
import { InMemorySectionRepository } from '../../src/repositories/memory/InMemorySectionRepository';
import { InMemoryStudentRepository } from '../../src/repositories/memory/InMemoryStudentRepository';
import type { AuditEntry, AuditLog } from '../../src/services/AuditLog';
import { AuthService } from '../../src/services/AuthService';
import { RegistryService } from '../../src/services/RegistryService';
import { FakeAdminRepository, fastHasher, SECRET, SECTION_ID } from './authTestKit';
import { assign, makeSection } from './factories';

export const SECTION_2_ID = '22222222-2222-4222-8222-222222222222';
export const CLUB_ID = '33333333-3333-4333-8333-333333333333';
export const POSITION_ID = '44444444-4444-4444-8444-444444444444';
export const STUDENT_ID = '55555555-5555-4555-8555-555555555555';
export const ADMIN_PASSWORD = 'admin password';

export class RecordingAudit implements AuditLog {
  entries: AuditEntry[] = [];
  record(entry: AuditEntry): void {
    this.entries.push(entry);
  }
}

export const admin = new Admin({
  userId: 'admin-1',
  name: 'Admin',
  email: 'admin@campus.edu',
  passwordHash: `hashed:${ADMIN_PASSWORD}`,
});

/** Everything in memory: one club with a secretary, one student, two sections. */
export function makeRegistryKit() {
  const section = makeSection(SECTION_ID);
  const section2 = makeSection(SECTION_2_ID, 'IT', 'B', 2);
  const club = new Club(CLUB_ID, 'Coding Club', 'We code');
  const secretary = new Position(POSITION_ID, 'Club Secretary', ScopeType.CLUB, [
    Permission.CREATE_CLUB_EVENT,
  ]);
  const student = new Student({
    userId: STUDENT_ID,
    name: 'Asha',
    email: null,
    passwordHash: 'hashed:x',
    enrollmentNo: 'IIT2025001',
    course: 'IT',
    section,
  });

  const sections = new InMemorySectionRepository([section, section2]);
  const students = new InMemoryStudentRepository([student]);
  // The club must carry its assignments, as the Postgres repository does.
  const assignments = [assign(secretary, { club }, null, STUDENT_ID)];
  const clubWithAssignments = new Club(CLUB_ID, club.name, club.description, assignments);
  const clubs = new InMemoryClubRepository([clubWithAssignments]);
  const positions = new InMemoryPositionRepository([secretary]);
  const audit = new RecordingAudit();

  const registry = new RegistryService({ sections, clubs, positions, students, audit });
  const authService = new AuthService(
    {
      students,
      admins: new FakeAdminRepository([admin]),
      sections,
      assignments: new InMemoryRoleAssignmentRepository(),
      passwords: fastHasher,
    },
    { jwtSecret: SECRET, jwtExpiresInSeconds: 3600 }
  );
  return { registry, authService, students, clubs, positions, audit };
}

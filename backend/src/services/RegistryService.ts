import { randomUUID } from 'node:crypto';
import type { AuthUser, ClubDetailDto, ClubMemberDto, Permission, ScopeType } from '@senoom/shared';
import { Club } from '../domain/Club';
import { DomainError } from '../domain/DomainError';
import { Position } from '../domain/Position';
import type { Section } from '../domain/Section';
import type { Student } from '../domain/Student';
import type { ClubRepository } from '../repositories/ClubRepository';
import type { PositionRepository } from '../repositories/PositionRepository';
import type { SectionRepository } from '../repositories/SectionRepository';
import type { StudentRepository } from '../repositories/StudentRepository';
import type { AuditLog } from './AuditLog';

export interface RegistryDeps {
  sections: SectionRepository;
  clubs: ClubRepository;
  positions: PositionRepository;
  students: StudentRepository;
  audit: AuditLog;
}

/**
 * Sections, clubs, positions and students. Who may call these is decided by the routes
 * (requirePermission with PermissionService); this class holds the rules and the audit trail.
 */
export class RegistryService {
  constructor(private readonly deps: RegistryDeps) {}

  // Sections (read only: they are seeded)

  listSections(): Promise<Section[]> {
    return this.deps.sections.findAll();
  }

  // Clubs

  listClubs(): Promise<Club[]> {
    return this.deps.clubs.findAll();
  }

  /** Public info plus office bearers (name and position only). */
  async getClub(clubId: string): Promise<ClubDetailDto> {
    const club = await this.mustFindClub(clubId);
    const bearers = club.getOfficeBearers();
    const names = await this.namesOf(bearers.map(b => b.studentId));
    return {
      clubId: club.clubId,
      name: club.name,
      description: club.description,
      officeBearers: bearers.flatMap(b => {
        const student = names.get(b.studentId);
        return student
          ? [{ studentId: b.studentId, name: student.name, positionName: b.position.name }]
          : [];
      }),
    };
  }

  /** Name and section only. Removed students are left out. */
  async listClubMembers(clubId: string): Promise<ClubMemberDto[]> {
    const club = await this.mustFindClub(clubId);
    const students = await this.namesOf(club.getMembers());
    return [...students.values()]
      .map(s => ({ studentId: s.userId, name: s.name, sectionName: s.section.getName() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createClub(actor: AuthUser, input: { name: string; description: string }): Promise<Club> {
    const club = new Club(randomUUID(), input.name, input.description);
    await this.deps.clubs.add(club); // CLUB_EXISTS on a duplicate name
    this.audit(actor, 'CLUB_CREATED', club.clubId);
    return club;
  }

  async updateClub(
    actor: AuthUser,
    clubId: string,
    input: { name?: string; description?: string }
  ): Promise<Club> {
    const club = await this.mustFindClub(clubId);
    if (input.name !== undefined) club.rename(input.name);
    if (input.description !== undefined) club.describe(input.description);
    await this.deps.clubs.update(club);
    this.audit(actor, 'CLUB_UPDATED', clubId);
    return club;
  }

  // Positions

  listPositions(): Promise<Position[]> {
    return this.deps.positions.findAll();
  }

  /** Position validates its permissions against its scope (INVALID_POSITION, 400). */
  async createPosition(
    actor: AuthUser,
    input: { name: string; scopeType: ScopeType; permissions: Permission[] }
  ): Promise<Position> {
    const position = new Position(randomUUID(), input.name, input.scopeType, input.permissions);
    await this.deps.positions.add(position); // POSITION_EXISTS on a duplicate name
    this.audit(actor, 'POSITION_CREATED', position.positionId);
    return position;
  }

  /**
   * Changes the name and/or permissions. The scope is fixed. Because roles are re-read on every
   * request, a permission change applies to every holder immediately.
   */
  async updatePosition(
    actor: AuthUser,
    positionId: string,
    input: { name?: string; permissions?: Permission[] }
  ): Promise<Position> {
    const existing = await this.deps.positions.findById(positionId);
    if (!existing) throw new DomainError('NOT_FOUND', 'Position not found');

    if (input.name !== undefined) {
      const clash = await this.deps.positions.findByName(input.name);
      if (clash && clash.positionId !== positionId) {
        throw new DomainError('POSITION_EXISTS', 'A position with this name already exists');
      }
    }
    const updated = new Position(
      positionId,
      input.name ?? existing.name,
      existing.scopeType,
      input.permissions ?? existing.permissions
    );
    await this.deps.positions.update(updated);
    this.audit(actor, 'POSITION_UPDATED', positionId);
    return updated;
  }

  // Students

  searchStudents(enrollmentPrefix: string, limit: number, offset: number): Promise<Student[]> {
    return this.deps.students.search(enrollmentPrefix, limit, offset);
  }

  getStudent(userId: string): Promise<Student> {
    return this.mustFindStudent(userId);
  }

  /** Name or section only. The enrollment number never changes. */
  async updateStudent(
    actor: AuthUser,
    userId: string,
    input: { name?: string; sectionId?: string }
  ): Promise<Student> {
    const student = await this.mustFindStudent(userId);
    if (input.sectionId !== undefined) {
      const section = await this.deps.sections.findById(input.sectionId);
      if (!section) throw new DomainError('SECTION_NOT_FOUND', 'Section does not exist');
      student.moveToSection(section);
    }
    if (input.name !== undefined) student.rename(input.name);
    await this.deps.students.update(student);
    this.audit(actor, 'STUDENT_UPDATED', userId);
    return student;
  }

  /** Soft delete: the account can no longer log in, and its enrollment number stays reserved. */
  async removeStudent(actor: AuthUser, userId: string): Promise<void> {
    await this.mustFindStudent(userId);
    await this.deps.students.deactivate(userId);
    this.audit(actor, 'STUDENT_REMOVED', userId);
  }

  // Helpers

  private async mustFindClub(clubId: string): Promise<Club> {
    const club = await this.deps.clubs.findById(clubId);
    if (!club) throw new DomainError('NOT_FOUND', 'Club not found');
    return club;
  }

  private async mustFindStudent(userId: string): Promise<Student> {
    const student = await this.deps.students.findById(userId);
    if (!student) throw new DomainError('NOT_FOUND', 'Student not found');
    return student;
  }

  /** Active students by id. Ids of removed accounts are simply missing. */
  private async namesOf(ids: string[]): Promise<Map<string, Student>> {
    const found = await Promise.all([...new Set(ids)].map(id => this.deps.students.findById(id)));
    const byId = new Map<string, Student>();
    for (const s of found) if (s) byId.set(s.userId, s);
    return byId;
  }

  private audit(actor: AuthUser, action: string, targetId: string): void {
    this.deps.audit.record({ actorId: actor.userId, action, targetId });
  }
}

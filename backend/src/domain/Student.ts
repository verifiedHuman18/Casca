import { Permission, ScopeTarget, UserType } from '@senoom/shared';
import { Club } from './Club';
import { DomainError } from './DomainError';
import { Position } from './Position';
import { RoleAssignment } from './RoleAssignment';
import { Section } from './Section';
import { User, UserProps } from './User';

export interface StudentProps extends UserProps {
  enrollmentNo: string;
  course: string;
  section: Section;
  roleAssignments?: RoleAssignment[];
}

export class Student extends User {
  private readonly _enrollmentNo: string; // set once, no setter
  private readonly _course: string;
  private _section: Section;
  private readonly _roleAssignments: RoleAssignment[];

  constructor(props: StudentProps) {
    super(props);
    this._enrollmentNo = Student.normaliseEnrollmentNo(props.enrollmentNo);
    if (!this._enrollmentNo) {
      throw new DomainError('INVALID_ENROLLMENT', 'Enrollment number is required');
    }
    this._course = props.course;
    this._section = props.section;
    this._roleAssignments = props.roleAssignments ?? [];
  }

  /** One rule for storing and comparing enrollment numbers. */
  static normaliseEnrollmentNo(raw: string): string {
    return raw.trim().toUpperCase();
  }

  get type(): UserType {
    return UserType.STUDENT;
  }
  get enrollmentNo(): string {
    return this._enrollmentNo;
  }
  get course(): string {
    return this._course;
  }
  get section(): Section {
    return this._section;
  }
  get roleAssignments(): readonly RoleAssignment[] {
    return this._roleAssignments;
  }

  /** A copy carrying the given active assignments. Repositories use it to hydrate a student. */
  withRoleAssignments(assignments: RoleAssignment[]): Student {
    return new Student({
      userId: this.userId,
      name: this.name,
      email: this.email,
      passwordHash: this.currentPasswordHash,
      enrollmentNo: this._enrollmentNo,
      course: this._course,
      section: this._section,
      roleAssignments: assignments,
    });
  }

  moveToSection(section: Section): void {
    this._section = section;
  }

  /** Year comes from the section, there is no separate field. */
  getYear(): number {
    return this._section.year;
  }

  private active(now: Date): RoleAssignment[] {
    return this._roleAssignments.filter(a => a.isActive(now));
  }

  getActivePositions(now: Date = new Date()): Position[] {
    return this.active(now).map(a => a.position);
  }

  /** Distinct clubs from active assignments, Club Member included. */
  getClubs(now: Date = new Date()): Club[] {
    const byId = new Map<string, Club>();
    for (const a of this.active(now)) {
      if (a.club) byId.set(a.club.clubId, a.club);
    }
    return [...byId.values()];
  }

  /** Union of all active assignments, each counting only inside its own scope. */
  hasPermission(permission: Permission, target: ScopeTarget, now: Date = new Date()): boolean {
    return this.active(now).some(a => a.coversTarget(target) && a.position.allows(permission));
  }
}

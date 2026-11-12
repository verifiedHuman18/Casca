import { randomUUID } from 'node:crypto';
import { AuthResponse, AuthUser, UserType } from '@senoom/shared';
import jwt from 'jsonwebtoken';
import type { AuthConfig } from '../config/authConfig';
import type { Admin } from '../domain/Admin';
import { DomainError } from '../domain/DomainError';
import { Student } from '../domain/Student';
import type { PasswordCheck } from '../domain/User';
import type { AdminRepository } from '../repositories/AdminRepository';
import type { RoleAssignmentRepository } from '../repositories/RoleAssignmentRepository';
import type { SectionRepository } from '../repositories/SectionRepository';
import type { StudentRepository } from '../repositories/StudentRepository';
import { AuthUserMapper } from './AuthUserMapper';

export interface AuthDeps {
  students: StudentRepository;
  admins: AdminRepository;
  sections: SectionRepository;
  assignments: RoleAssignmentRepository;
  passwords: PasswordCheck;
}

export interface SignUpInput {
  name: string;
  enrollmentNo: string;
  sectionId: string;
  password: string;
}

/** Students log in with an enrollment number, admins with an email. */
export type LoginInput =
  { enrollmentNo: string; password: string } | { email: string; password: string };

const ALGORITHM = 'HS256';
const BAD_CREDENTIALS = 'Invalid enrollment number, email or password';

export class AuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly deps: AuthDeps,
    private readonly config: AuthConfig
  ) {}

  /** UC-13. Always creates a STUDENT with no role assignments, and logs them in. */
  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const { students, sections, passwords } = this.deps;
    const problem = passwords.validate(input.password);
    if (problem) throw new DomainError('INVALID_PASSWORD', problem);

    const section = await sections.findById(input.sectionId);
    if (!section) throw new DomainError('SECTION_NOT_FOUND', 'Section does not exist');

    const enrollmentNo = Student.normaliseEnrollmentNo(input.enrollmentNo);
    if (await students.existsByEnrollmentNo(enrollmentNo)) {
      throw new DomainError(
        'ENROLLMENT_EXISTS',
        'This enrollment number is already registered. Log in instead.'
      );
    }

    const student = new Student({
      userId: randomUUID(),
      name: input.name,
      email: null,
      passwordHash: await passwords.hash(input.password),
      enrollmentNo,
      course: section.course,
      section,
    });
    // The repository also translates a concurrent duplicate into ENROLLMENT_EXISTS.
    await students.create(student);
    return this.respond(AuthUserMapper.forStudent(student, []));
  }

  /** UC-01. Every failure returns the same error so accounts cannot be probed. */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { students, admins, passwords } = this.deps;
    const account: Student | Admin | null =
      'email' in input
        ? await admins.findByEmail(input.email.trim())
        : await students.findByEnrollmentNo(input.enrollmentNo);

    // Unknown accounts still pay for one bcrypt compare, so timing does not reveal them.
    const ok = account
      ? await account.login(input.password, passwords)
      : await passwords.verify(input.password, await this.getDummyHash()).then(() => false);
    if (!account || !ok) throw new DomainError('INVALID_CREDENTIALS', BAD_CREDENTIALS);

    const user =
      account instanceof Student
        ? await this.studentAuthUser(account)
        : AuthUserMapper.forAdmin(account);
    return this.respond(user);
  }

  /**
   * Called by requireAuth on every request. Checks the token, then builds the AuthUser from
   * the database, so a revoked position or a removed account takes effect on the next request.
   */
  async authenticate(token: string): Promise<AuthUser> {
    const { userId, type } = this.verifyToken(token);
    if (type === UserType.ADMIN) {
      const admin = await this.deps.admins.findById(userId);
      if (!admin) throw this.unauthenticated();
      return AuthUserMapper.forAdmin(admin);
    }
    const student = await this.deps.students.findById(userId);
    if (!student) throw this.unauthenticated();
    return this.studentAuthUser(student);
  }

  async changePassword(user: AuthUser, current: string, next: string): Promise<void> {
    const { students, admins, passwords } = this.deps;
    if (user.type === UserType.ADMIN) {
      const admin = await admins.findById(user.userId);
      if (!admin) throw this.unauthenticated();
      await admin.changePassword(current, next, passwords);
      await admins.update(admin);
      return;
    }
    const student = await students.findById(user.userId);
    if (!student) throw this.unauthenticated();
    await student.changePassword(current, next, passwords);
    await students.update(student);
  }

  private verifyToken(token: string): { userId: string; type: UserType } {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, { algorithms: [ALGORITHM] });
      if (typeof payload === 'string' || !payload.sub) throw new Error('no subject');
      const type = payload.type as unknown;
      if (type !== UserType.STUDENT && type !== UserType.ADMIN) throw new Error('bad type');
      return { userId: payload.sub, type };
    } catch {
      throw this.unauthenticated();
    }
  }

  /** Token carries only sub and type, never roles. */
  private respond(user: AuthUser): AuthResponse {
    const token = jwt.sign({ type: user.type }, this.config.jwtSecret, {
      algorithm: ALGORITHM,
      subject: user.userId,
      expiresIn: this.config.jwtExpiresInSeconds,
    });
    return { token, user };
  }

  private async studentAuthUser(student: Student): Promise<AuthUser> {
    const assignments = await this.deps.assignments.findActiveByStudent(student.userId);
    return AuthUserMapper.forStudent(student, assignments);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.deps.passwords.hash(randomUUID());
    return this.dummyHash;
  }

  private unauthenticated(): DomainError {
    return new DomainError('UNAUTHENTICATED', 'Invalid or expired token');
  }
}

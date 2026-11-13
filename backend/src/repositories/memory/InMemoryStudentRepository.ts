import { DomainError } from '../../domain/DomainError';
import { Student } from '../../domain/Student';
import type { StudentRepository } from '../StudentRepository';

interface Entry {
  student: Student;
  active: boolean;
}

export class InMemoryStudentRepository implements StudentRepository {
  private readonly byId = new Map<string, Entry>();

  constructor(students: Student[] = []) {
    students.forEach(s => this.byId.set(s.userId, { student: s, active: true }));
  }

  private activeStudents(): Student[] {
    return [...this.byId.values()].filter(e => e.active).map(e => e.student);
  }

  findById(userId: string): Promise<Student | null> {
    return Promise.resolve(this.activeStudents().find(s => s.userId === userId) ?? null);
  }

  findByEnrollmentNo(enrollmentNo: string): Promise<Student | null> {
    const wanted = Student.normaliseEnrollmentNo(enrollmentNo);
    return Promise.resolve(this.activeStudents().find(s => s.enrollmentNo === wanted) ?? null);
  }

  search(enrollmentPrefix: string, limit: number, offset: number): Promise<Student[]> {
    const prefix = Student.normaliseEnrollmentNo(enrollmentPrefix);
    const matches = this.activeStudents()
      .filter(s => s.enrollmentNo.startsWith(prefix))
      .sort((a, b) => a.enrollmentNo.localeCompare(b.enrollmentNo));
    return Promise.resolve(matches.slice(offset, offset + limit));
  }

  existsByEnrollmentNo(enrollmentNo: string): Promise<boolean> {
    const wanted = Student.normaliseEnrollmentNo(enrollmentNo);
    return Promise.resolve([...this.byId.values()].some(e => e.student.enrollmentNo === wanted));
  }

  create(student: Student): Promise<void> {
    const all = [...this.byId.values()].map(e => e.student);
    if (all.some(s => s.enrollmentNo === student.enrollmentNo)) {
      return Promise.reject(
        new DomainError('ENROLLMENT_EXISTS', 'This enrollment number is already registered')
      );
    }
    const email = student.email?.toLowerCase();
    if (email && all.some(s => s.email?.toLowerCase() === email)) {
      return Promise.reject(new DomainError('EMAIL_EXISTS', 'This email is already registered'));
    }
    this.byId.set(student.userId, { student, active: true });
    return Promise.resolve();
  }

  update(student: Student): Promise<void> {
    const entry = this.byId.get(student.userId);
    if (!entry) return Promise.reject(new DomainError('NOT_FOUND', 'Student not found'));
    entry.student = student;
    return Promise.resolve();
  }

  deactivate(userId: string): Promise<void> {
    const entry = this.byId.get(userId);
    if (!entry) return Promise.reject(new DomainError('NOT_FOUND', 'Student not found'));
    entry.active = false;
    return Promise.resolve();
  }
}

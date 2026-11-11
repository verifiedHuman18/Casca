import { DomainError } from './DomainError';

export class Section {
  constructor(
    private readonly _sectionId: string,
    private readonly _course: string,
    private readonly _label: string,
    private readonly _year: number
  ) {
    if (!_course.trim() || !_label.trim()) {
      throw new DomainError('INVALID_SECTION', 'Section needs a course and a label');
    }
    if (!Number.isInteger(_year) || _year < 1 || _year > 4) {
      throw new DomainError('INVALID_SECTION', 'Section year must be 1 to 4');
    }
  }

  get sectionId(): string {
    return this._sectionId;
  }
  get course(): string {
    return this._course;
  }
  get label(): string {
    return this._label;
  }
  get year(): number {
    return this._year;
  }

  /** e.g. "IT-A (Year 2)". IT-C and IT-BI-C can never collide. */
  getName(): string {
    return `${this._course}-${this._label} (Year ${this._year})`;
  }

  /** Always compare sections by id, never by label. */
  equals(other: Section): boolean {
    return this._sectionId === other._sectionId;
  }
}

import type { ClubDto, PositionDto, SectionDto, StudentDto } from '@senoom/shared';
import type { Club } from '../domain/Club';
import type { Position } from '../domain/Position';
import type { Section } from '../domain/Section';
import type { Student } from '../domain/Student';

export const toSectionDto = (s: Section): SectionDto => ({
  sectionId: s.sectionId,
  course: s.course,
  label: s.label,
  year: s.year,
  name: s.getName(),
});

export const toClubDto = (c: Club): ClubDto => ({
  clubId: c.clubId,
  name: c.name,
  description: c.description,
});

export const toPositionDto = (p: Position): PositionDto => ({
  positionId: p.positionId,
  name: p.name,
  scopeType: p.scopeType,
  permissions: [...p.permissions],
});

/** No hash, no email. The course comes from the section so it is right after a move. */
export const toStudentDto = (s: Student): StudentDto => ({
  userId: s.userId,
  name: s.name,
  enrollmentNo: s.enrollmentNo,
  course: s.section.course,
  year: s.section.year,
  section: toSectionDto(s.section),
});

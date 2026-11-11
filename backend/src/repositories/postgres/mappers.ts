import type { Permission, ScopeType } from '@senoom/shared';
import { Position } from '../../domain/Position';
import { Section } from '../../domain/Section';

export interface SectionRow {
  section_id: string;
  course: string;
  label: string;
  year: number;
}

export interface PositionRow {
  position_id: string;
  name: string;
  scope_type: ScopeType;
  permissions: Permission[];
}

export function rowToSection(row: SectionRow): Section {
  return new Section(row.section_id, row.course, row.label, row.year);
}

export function rowToPosition(row: PositionRow): Position {
  return new Position(row.position_id, row.name, row.scope_type, row.permissions);
}

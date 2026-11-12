import type { Pool } from 'pg';
import type { Section } from '../../domain/Section';
import type { SectionRepository } from '../SectionRepository';
import { rowToSection, type SectionRow } from './mappers';

export class PostgresSectionRepository implements SectionRepository {
  constructor(private readonly pool: Pool) {}

  async findById(sectionId: string): Promise<Section | null> {
    const res = await this.pool.query<SectionRow>(
      'SELECT section_id, course, label, year FROM sections WHERE section_id = $1',
      [sectionId]
    );
    return res.rows[0] ? rowToSection(res.rows[0]) : null;
  }

  async findAll(): Promise<Section[]> {
    const res = await this.pool.query<SectionRow>(
      'SELECT section_id, course, label, year FROM sections ORDER BY course, label, year'
    );
    return res.rows.map(rowToSection);
  }
}

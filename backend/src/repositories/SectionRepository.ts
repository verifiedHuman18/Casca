import type { Section } from '../domain/Section';

export interface SectionRepository {
  findById(sectionId: string): Promise<Section | null>;
  findAll(): Promise<Section[]>;
}

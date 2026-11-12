import type { Section } from '../../domain/Section';
import type { SectionRepository } from '../SectionRepository';

export class InMemorySectionRepository implements SectionRepository {
  constructor(private readonly sections: Section[] = []) {}

  findById(sectionId: string): Promise<Section | null> {
    return Promise.resolve(this.sections.find(s => s.sectionId === sectionId) ?? null);
  }

  findAll(): Promise<Section[]> {
    return Promise.resolve([...this.sections]);
  }
}

// Section.test.ts
import { describe, expect, it } from 'vitest';
import { Section } from '../../src/domain/Section';
import { makeSection } from './factories';

describe('Section', () => {
  it('names a section with its year', () => {
    expect(makeSection('1', 'IT', 'A', 2).getName()).toBe('IT-A (Year 2)');
  });
  it('keeps IT-C and IT-BI-C apart', () => {
    const itC = makeSection('1', 'IT', 'C', 2);
    const biC = makeSection('2', 'IT-BI', 'C', 2);
    expect(itC.getName()).not.toBe(biC.getName());
    expect(itC.equals(biC)).toBe(false);
  });
  it('treats the same label in different years as different sections', () => {
    expect(makeSection('1', 'IT', 'A', 1).equals(makeSection('2', 'IT', 'A', 2))).toBe(false);
  });
  it('rejects an invalid year', () => {
    expect(() => new Section('1', 'IT', 'A', 7)).toThrow();
  });
});

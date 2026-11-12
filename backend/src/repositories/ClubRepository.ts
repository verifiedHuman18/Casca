import type { Club } from '../domain/Club';

export interface ClubRepository {
  /** Clubs come with their active role assignments, so getMembers() works. */
  findById(clubId: string): Promise<Club | null>;
  findAll(): Promise<Club[]>;
  add(club: Club): Promise<void>;
  update(club: Club): Promise<void>;
}

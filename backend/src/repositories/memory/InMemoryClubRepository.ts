import type { Club } from '../../domain/Club';
import { DomainError } from '../../domain/DomainError';
import type { ClubRepository } from '../ClubRepository';

export class InMemoryClubRepository implements ClubRepository {
  private readonly byId = new Map<string, Club>();

  constructor(clubs: Club[] = []) {
    clubs.forEach(c => this.byId.set(c.clubId, c));
  }

  findById(clubId: string): Promise<Club | null> {
    return Promise.resolve(this.byId.get(clubId) ?? null);
  }

  findAll(): Promise<Club[]> {
    return Promise.resolve([...this.byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  add(club: Club): Promise<void> {
    if ([...this.byId.values()].some(c => c.name === club.name)) {
      return Promise.reject(new DomainError('CLUB_EXISTS', 'A club with this name already exists'));
    }
    this.byId.set(club.clubId, club);
    return Promise.resolve();
  }

  update(club: Club): Promise<void> {
    if (!this.byId.has(club.clubId)) {
      return Promise.reject(new DomainError('NOT_FOUND', 'Club not found'));
    }
    const clash = [...this.byId.values()].some(
      c => c.clubId !== club.clubId && c.name === club.name
    );
    if (clash) {
      return Promise.reject(new DomainError('CLUB_EXISTS', 'A club with this name already exists'));
    }
    this.byId.set(club.clubId, club);
    return Promise.resolve();
  }
}

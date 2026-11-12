// InMemoryPositionRepository.ts
import { DomainError } from '../../domain/DomainError';
import type { Position } from '../../domain/Position';
import type { PositionRepository } from '../PositionRepository';

export class InMemoryPositionRepository implements PositionRepository {
  private readonly byId = new Map<string, Position>();

  constructor(positions: Position[] = []) {
    positions.forEach(p => this.byId.set(p.positionId, p));
  }

  findById(positionId: string): Promise<Position | null> {
    return Promise.resolve(this.byId.get(positionId) ?? null);
  }

  findByName(name: string): Promise<Position | null> {
    return Promise.resolve([...this.byId.values()].find(p => p.name === name) ?? null);
  }

  findAll(): Promise<Position[]> {
    return Promise.resolve([...this.byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  add(position: Position): Promise<void> {
    if ([...this.byId.values()].some(p => p.name === position.name)) {
      return Promise.reject(
        new DomainError('POSITION_EXISTS', 'A position with this name already exists')
      );
    }
    this.byId.set(position.positionId, position);
    return Promise.resolve();
  }

  update(position: Position): Promise<void> {
    if (!this.byId.has(position.positionId)) {
      return Promise.reject(new DomainError('NOT_FOUND', 'Position not found'));
    }
    this.byId.set(position.positionId, position);
    return Promise.resolve();
  }
}

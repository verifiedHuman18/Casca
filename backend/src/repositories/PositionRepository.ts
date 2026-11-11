import type { Position } from '../domain/Position';

export interface PositionRepository {
  findById(positionId: string): Promise<Position | null>;
  findByName(name: string): Promise<Position | null>;
  findAll(): Promise<Position[]>;
  /** Throws DomainError('POSITION_EXISTS') if the name is taken. */
  add(position: Position): Promise<void>;
  /** Persists name, scope and the full permission set for this id. */
  update(position: Position): Promise<void>;
}

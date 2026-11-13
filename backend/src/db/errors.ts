interface PgError {
  code?: string;
  constraint?: string;
}

/** PostgreSQL unique_violation. */
export function isUniqueViolation(err: unknown): boolean {
  return (err as PgError | null)?.code === '23505';
}

/** Name of the violated constraint or index, or an empty string. */
export function violatedConstraint(err: unknown): string {
  return (err as PgError | null)?.constraint ?? '';
}

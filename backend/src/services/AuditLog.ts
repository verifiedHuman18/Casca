export interface AuditEntry {
  actorId: string;
  /** e.g. CLUB_CREATED, POSITION_UPDATED, STUDENT_REMOVED. */
  action: string;
  targetId: string;
}

/** Where administrative changes are recorded. Never put passwords or tokens in an entry. */
export interface AuditLog {
  record(entry: AuditEntry): void;
}

/** Writes one JSON line per change. Swap for a database table later without touching callers. */
export class ConsoleAuditLog implements AuditLog {
  record(entry: AuditEntry): void {
    console.info(JSON.stringify({ audit: { ...entry, at: new Date().toISOString() } }));
  }
}

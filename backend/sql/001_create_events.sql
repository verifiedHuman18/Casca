CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('CAMPUS','CLUB','SECTION')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL CHECK (length(trim(venue)) > 0),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL','ACTIVE','REJECTED','CANCELLED')),
  approved_by TEXT NULL,
  decided_on TIMESTAMPTZ NULL,
  decision_note TEXT NULL,
  club_id TEXT NULL,
  club_visibility TEXT NULL CHECK (club_visibility IS NULL OR club_visibility IN ('PUBLIC','MEMBERS_ONLY')),
  CONSTRAINT events_end_after_start CHECK (end_time > start_time),
  CONSTRAINT events_scope_columns CHECK (
    (event_type = 'CAMPUS' AND club_id IS NULL AND club_visibility IS NULL) OR
    (event_type = 'CLUB' AND club_id IS NOT NULL AND club_visibility IS NOT NULL) OR
    (event_type = 'SECTION' AND club_id IS NULL AND club_visibility IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS event_sections (
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  PRIMARY KEY (event_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_events_calendar_time ON events(start_time,end_time);
CREATE INDEX IF NOT EXISTS idx_events_status_type ON events(event_type,status);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_venue_time ON events(lower(trim(venue)),start_time,end_time);
CREATE INDEX IF NOT EXISTS idx_event_sections_section ON event_sections(section_id);

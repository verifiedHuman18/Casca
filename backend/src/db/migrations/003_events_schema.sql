-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('CAMPUS','CLUB','SECTION')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL CHECK (length(trim(venue)) > 0),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL','ACTIVE','REJECTED','CANCELLED')),
  approved_by TEXT NULL,
  decided_on TIMESTAMPTZ NULL,
  decision_note TEXT NULL,
  club_id UUID NULL,
  club_visibility TEXT NULL CHECK (
    club_visibility IS NULL OR club_visibility IN ('PUBLIC','MEMBERS_ONLY')
  ),
  CONSTRAINT events_end_after_start CHECK (end_time > start_time),
  CONSTRAINT events_scope_columns CHECK (
    (event_type = 'CAMPUS' AND club_id IS NULL AND club_visibility IS NULL) OR
    (event_type = 'CLUB' AND club_id IS NOT NULL AND club_visibility IS NOT NULL) OR
    (event_type = 'SECTION' AND club_id IS NULL AND club_visibility IS NULL)
  ),
  CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT events_club_id_fkey
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS event_sections (
  event_id UUID NOT NULL,
  section_id UUID NOT NULL,
  PRIMARY KEY (event_id, section_id),
  CONSTRAINT event_sections_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT event_sections_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
);

-- Upgrade databases where the Events tables were created by the old standalone script.
-- Skip conversions when columns are already UUID (fresh installations).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'events'
      AND column_name = 'created_by'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE events
      ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'events'
      AND column_name = 'club_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE events
      ALTER COLUMN club_id TYPE UUID USING club_id::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'event_sections'
      AND column_name = 'section_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE event_sections
      ALTER COLUMN section_id TYPE UUID USING section_id::uuid;
  END IF;
END
$$;

-- Add foreign keys to pre-existing tables if they were not created above.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'events'::regclass
      AND conname = 'events_created_by_fkey'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'events'::regclass
      AND conname = 'events_club_id_fkey'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_club_id_fkey
      FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'event_sections'::regclass
      AND conname = 'event_sections_section_id_fkey'
  ) THEN
    ALTER TABLE event_sections
      ADD CONSTRAINT event_sections_section_id_fkey
      FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_events_calendar_time
  ON events(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_events_status_type
  ON events(event_type, status);

CREATE INDEX IF NOT EXISTS idx_events_creator
  ON events(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_venue_time
  ON events(lower(trim(venue)), start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_event_sections_section
  ON event_sections(section_id);

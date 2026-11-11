-- Up Migration
CREATE TABLE sections (
  section_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course text NOT NULL,
  label text NOT NULL,
  year smallint NOT NULL CHECK (year BETWEEN 1 AND 4),
  UNIQUE (course, label, year)
);

CREATE TABLE clubs (
  club_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE positions (
  position_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  scope_type text NOT NULL CHECK (scope_type IN ('CAMPUS','CLUB','SECTION'))
);

CREATE TABLE position_permissions (
  position_id uuid NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN (
    'CREATE_CAMPUS_EVENT','REQUEST_CAMPUS_EVENT','APPROVE_CAMPUS_EVENT',
    'CREATE_CLUB_EVENT','CREATE_SECTION_EVENT','EDIT_ANY_IN_SCOPE',
    'MANAGE_ROLES','MANAGE_REGISTRY')),
  PRIMARY KEY (position_id, permission)
);

CREATE TABLE users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  password_hash text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('STUDENT','ADMIN')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  user_id uuid PRIMARY KEY REFERENCES users(user_id),
  enrollment_no text NOT NULL UNIQUE,
  course text NOT NULL,
  section_id uuid NOT NULL REFERENCES sections(section_id)
);

CREATE TABLE role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(user_id),
  position_id uuid NOT NULL REFERENCES positions(position_id),
  club_id uuid REFERENCES clubs(club_id),
  section_id uuid REFERENCES sections(section_id),
  assigned_by uuid NOT NULL REFERENCES users(user_id),
  assigned_on timestamptz NOT NULL DEFAULT now(),
  ends_on timestamptz,
  CHECK (club_id IS NULL OR section_id IS NULL)
);

-- one open-ended assignment per (student, position, club, section); NULLs treated as equal
CREATE UNIQUE INDEX uq_role_assignments_active ON role_assignments (
  student_id, position_id,
  COALESCE(club_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE ends_on IS NULL;

CREATE INDEX idx_role_assignments_student_active ON role_assignments (student_id) WHERE ends_on IS NULL;
CREATE INDEX idx_role_assignments_club ON role_assignments (club_id);
CREATE INDEX idx_students_section ON students (section_id);

-- Down Migration
DROP TABLE role_assignments, students, users, position_permissions, positions, clubs, sections;
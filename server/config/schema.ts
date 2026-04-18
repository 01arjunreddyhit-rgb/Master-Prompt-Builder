import pool from "./db";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS admins (
    admin_id TEXT PRIMARY KEY,
    admin_name TEXT NOT NULL,
    college_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code TEXT,
    otp_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS elections (
    election_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    election_name TEXT NOT NULL,
    semester_tag TEXT,
    batch_tag TEXT,
    total_students INTEGER DEFAULT 126,
    final_courses_per_student INTEGER DEFAULT 2,
    faculty_count INTEGER DEFAULT 4,
    min_class_size INTEGER DEFAULT 45,
    max_class_size INTEGER DEFAULT 75,
    window_start TIMESTAMP,
    window_end TIMESTAMP,
    status TEXT DEFAULT 'NOT_STARTED',
    stop_reason_text TEXT,
    current_round INTEGER DEFAULT 0,
    field_config JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS stop_reason_repository (
    reason_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    reason_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    student_id SERIAL PRIMARY KEY,
    register_number TEXT NOT NULL UNIQUE,
    full_student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'A',
    batch_year TEXT,
    admin_id TEXT NOT NULL,
    election_id INTEGER,
    is_approved BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS pending_registrations (
    pending_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    register_number TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    section TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    otp_code TEXT,
    otp_expires_at TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    course_name TEXT NOT NULL,
    subject_code TEXT,
    description TEXT,
    batch TEXT,
    semester TEXT,
    credit_weight DECIMAL(3, 1) DEFAULT 3.0,
    is_active BOOLEAN DEFAULT TRUE,
    is_burst BOOLEAN DEFAULT FALSE,
    confirmed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS course_library (
    library_course_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    library_key TEXT NOT NULL,
    course_name TEXT NOT NULL,
    subject_code TEXT,
    description TEXT,
    batch TEXT,
    semester TEXT,
    credit_weight DECIMAL(3, 1) DEFAULT 3.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT course_library_admin_key_unique UNIQUE (admin_id, library_key)
  )`,
  `CREATE TABLE IF NOT EXISTS seats (
    seat_id SERIAL PRIMARY KEY,
    seat_number INTEGER NOT NULL,
    seat_code TEXT NOT NULL,
    election_id INTEGER NOT NULL,
    course_id INTEGER,
    student_token_id INTEGER,
    is_available BOOLEAN DEFAULT TRUE,
    booked_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS student_tokens (
    token_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    election_id INTEGER NOT NULL,
    token_number INTEGER NOT NULL,
    token_code TEXT NOT NULL UNIQUE,
    course_id INTEGER,
    seat_id INTEGER,
    status TEXT DEFAULT 'UNUSED',
    timestamp_booked TIMESTAMP,
    round_confirmed INTEGER,
    is_auto_assigned BOOLEAN DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_rounds (
    round_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    courses_confirmed JSON,
    courses_burst JSON,
    students_confirmed INTEGER DEFAULT 0,
    students_in_pool INTEGER DEFAULT 0,
    capacity_settings JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT allocation_rounds_election_round_unique UNIQUE (election_id, round_number)
  )`,
  `CREATE TABLE IF NOT EXISTS final_assignments (
    assignment_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    election_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS assignment_details (
    detail_id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS election_cav (
    cav_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL UNIQUE,
    election_code TEXT NOT NULL UNIQUE,
    join_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    generated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS election_participants (
    participant_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    name_updated BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'PENDING',
    confirmed_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS election_messages (
    message_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    message_type TEXT DEFAULT 'INFO',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS election_choice_results (
    result_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    token_number INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    original_status TEXT NOT NULL,
    is_auto_assigned BOOLEAN DEFAULT FALSE,
    seat_id INTEGER,
    round_confirmed INTEGER,
    token_code TEXT NOT NULL,
    locked_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT election_choice_results_unique UNIQUE (election_id, student_id, token_number)
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_sessions (
    session_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    session_name TEXT NOT NULL,
    notes TEXT,
    is_final BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_overrides (
    override_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    election_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    token_number INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_session_tokens (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    status TEXT,
    seat_id INTEGER,
    round_confirmed INTEGER,
    is_auto_assigned BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_session_courses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    is_active BOOLEAN,
    is_burst BOOLEAN,
    confirmed_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_steps (
    step_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    course_id INTEGER,
    course_name TEXT,
    reason TEXT,
    cascade_count INTEGER DEFAULT 0,
    confirm_count INTEGER DEFAULT 0,
    snapshot_json TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS faculty (
    faculty_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Dormant future schema note:
  // We intentionally are not creating `election_invites` in the active schema bootstrap.
  // That table belongs to a later invite-first onboarding model where students activate
  // directly from an election link. The current live flow remains self-registration.

  `CREATE TABLE IF NOT EXISTS class_rooms (
    room_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    room_number_roman TEXT,
    base_capacity INTEGER DEFAULT 60,
    current_capacity INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS room_tickets (
    ticket_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    faculty_id INTEGER,
    assigned_capacity INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS allocation_versions (
    version_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    version_name TEXT NOT NULL,
    parent_version_id INTEGER,
    data_snapshot JSON NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // Instruction 4/5/6: Email invite list + institution data per election
  `CREATE TABLE IF NOT EXISTS election_email_invites (
    invite_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    admin_id TEXT NOT NULL,
    email TEXT NOT NULL,
    metadata_json TEXT,
    is_invited BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT election_email_invites_unique UNIQUE (election_id, email)
  )`,
  // Burst Reason Repository (admin-managed, like Faculty/Course repos)
  `CREATE TABLE IF NOT EXISTS burst_reason_repository (
    reason_id SERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    reason_text TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  // Token Busts audit log
  `CREATE TABLE IF NOT EXISTS token_busts (
    bust_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    admin_id TEXT NOT NULL,
    bust_mode INTEGER NOT NULL,
    target_student_id INTEGER,
    target_course_id INTEGER,
    target_token_number INTEGER,
    reason_text TEXT,
    tokens_busted INTEGER DEFAULT 0,
    seats_removed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
];

const schemaPatchStatements = [
  `ALTER TABLE elections ADD COLUMN IF NOT EXISTS scheduled_mode BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE elections ADD COLUMN IF NOT EXISTS invitee_count INTEGER DEFAULT 0`,
  `ALTER TABLE elections ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE election_participants ADD COLUMN IF NOT EXISTS metadata_json TEXT`,
  `ALTER TABLE election_participants ADD COLUMN IF NOT EXISTS is_invited BOOLEAN DEFAULT TRUE`,
  // Q2: field schema the admin defines before uploading CSV
  `ALTER TABLE elections ADD COLUMN IF NOT EXISTS invite_field_config TEXT`,
  // Q2: admin-provided Platform ID + Username for identity matching
  `ALTER TABLE election_email_invites ADD COLUMN IF NOT EXISTS platform_id_given TEXT`,
  `ALTER TABLE election_email_invites ADD COLUMN IF NOT EXISTS username_given TEXT`,
  // Student tokens: bust tracking
  `ALTER TABLE student_tokens ADD COLUMN IF NOT EXISTS is_busted BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE student_tokens ADD COLUMN IF NOT EXISTS bust_reason TEXT`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS college_name TEXT`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS otp_code TEXT`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS otp_code TEXT`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'A'`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_year TEXT`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS election_id INTEGER`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS subject_code TEXT`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS min_enrollment INTEGER DEFAULT 45`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS max_enrollment INTEGER DEFAULT 75`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS classes_per_course INTEGER DEFAULT 1`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS credit_weight DECIMAL(3, 1) DEFAULT 3.0`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS batch TEXT`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester TEXT`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS batch TEXT`,
  `ALTER TABLE course_library ADD COLUMN IF NOT EXISTS semester TEXT`,
  `ALTER TABLE courses DROP COLUMN IF EXISTS total_seats`,
  `ALTER TABLE course_library DROP COLUMN IF EXISTS total_seats`,
  `ALTER TABLE elections ADD COLUMN IF NOT EXISTS stop_reason_text TEXT`,
  `ALTER TABLE seats ADD COLUMN IF NOT EXISTS room_ticket_id INTEGER`,
];

export async function ensureDatabaseSchema() {
  for (const statement of schemaStatements) {
    await pool.execute(statement);
  }
  for (const statement of schemaPatchStatements) {
    await pool.execute(statement);
  }
}

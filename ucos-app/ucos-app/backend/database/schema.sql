-- ============================================================
-- UCOS Database Schema
-- Universal Course Opting System
-- ============================================================

CREATE DATABASE IF NOT EXISTS ucos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ucos_db;

-- ── 1. ADMINS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    admin_id       VARCHAR(20) PRIMARY KEY,
    admin_name     VARCHAR(100) NOT NULL,
    college_name   VARCHAR(150) NOT NULL,
    email          VARCHAR(100) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    is_verified    BOOLEAN DEFAULT FALSE,
    otp_code       VARCHAR(10) DEFAULT NULL,
    otp_expires_at DATETIME DEFAULT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── 2. ELECTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elections (
    election_id               INT PRIMARY KEY AUTO_INCREMENT,
    admin_id                  VARCHAR(20) NOT NULL,
    election_name             VARCHAR(150) NOT NULL,
    semester_tag              VARCHAR(50) DEFAULT NULL,
    batch_tag                 VARCHAR(50) DEFAULT NULL,
    total_students            INT DEFAULT 126,
    final_courses_per_student INT DEFAULT 2,
    faculty_count             INT DEFAULT 4,
    min_class_size            INT DEFAULT 45,
    max_class_size            INT DEFAULT 75,
    window_start              TIMESTAMP NULL DEFAULT NULL,
    window_end                TIMESTAMP NULL DEFAULT NULL,
    status ENUM('NOT_STARTED','ACTIVE','PAUSED','STOPPED') DEFAULT 'NOT_STARTED',
    current_round             INT DEFAULT 0,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id),
    INDEX idx_status (status)
);

-- ── 3. STUDENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    student_id      INT PRIMARY KEY AUTO_INCREMENT,
    register_number VARCHAR(15) UNIQUE NOT NULL,
    full_student_id VARCHAR(25) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    section         VARCHAR(5) NOT NULL DEFAULT 'A',
    batch_year      VARCHAR(10) DEFAULT NULL,
    admin_id        VARCHAR(20) NOT NULL,
    election_id     INT DEFAULT NULL,
    is_approved     BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT TRUE,
    force_password_change BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE SET NULL,
    INDEX idx_admin (admin_id),
    INDEX idx_section (section),
    INDEX idx_approved (is_approved)
);

-- ── 4. PENDING REGISTRATIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_registrations (
    pending_id      INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    register_number VARCHAR(15) NOT NULL,
    email           VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    section         VARCHAR(5) NOT NULL,
    admin_id        VARCHAR(20) NOT NULL,
    otp_code        VARCHAR(10) DEFAULT NULL,
    otp_expires_at  DATETIME DEFAULT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    requested_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE
);

-- ── 5. COURSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    course_id          INT PRIMARY KEY AUTO_INCREMENT,
    election_id        INT NOT NULL,
    course_name        VARCHAR(100) NOT NULL,
    subject_code       VARCHAR(20) DEFAULT NULL,
    description        TEXT DEFAULT NULL,
    total_seats        INT DEFAULT 126,
    min_enrollment     INT DEFAULT 45,
    max_enrollment     INT DEFAULT 75,
    classes_per_course INT DEFAULT 1,
    credit_weight      DECIMAL(3,1) DEFAULT 3.0,
    is_active          BOOLEAN DEFAULT TRUE,
    is_burst           BOOLEAN DEFAULT FALSE,
    confirmed_count    INT DEFAULT 0,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_election (election_id),
    INDEX idx_active (is_active)
);

-- ── 6. SEATS (Global Pool) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS seats (
    seat_id          INT PRIMARY KEY AUTO_INCREMENT,
    seat_number      INT NOT NULL,
    seat_code        VARCHAR(12) NOT NULL,
    election_id      INT NOT NULL,
    course_id        INT DEFAULT NULL,
    student_token_id INT DEFAULT NULL,
    is_available     BOOLEAN DEFAULT TRUE,
    booked_at        TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_seat_election (seat_number, election_id),
    UNIQUE KEY uq_seat_code (seat_code, election_id),
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_available (is_available),
    INDEX idx_seat_number (seat_number),
    INDEX idx_election (election_id)
);

-- ── 7. STUDENT TOKENS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_tokens (
    token_id         INT PRIMARY KEY AUTO_INCREMENT,
    student_id       INT NOT NULL,
    election_id      INT NOT NULL,
    token_number     INT NOT NULL,
    token_code       VARCHAR(35) NOT NULL,
    course_id        INT DEFAULT NULL,
    seat_id          INT DEFAULT NULL,
    status ENUM('UNUSED','BOOKED','CONFIRMED','BURST','AUTO') DEFAULT 'UNUSED',
    timestamp_booked TIMESTAMP NULL DEFAULT NULL,
    round_confirmed  INT DEFAULT NULL,
    is_auto_assigned BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_token_code (token_code),
    UNIQUE KEY uq_student_token (student_id, election_id, token_number),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_election (election_id),
    INDEX idx_status (status),
    INDEX idx_course (course_id)
);

-- ── 8. ALLOCATION ROUNDS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS allocation_rounds (
    round_id           INT PRIMARY KEY AUTO_INCREMENT,
    election_id        INT NOT NULL,
    round_number       INT NOT NULL,
    courses_confirmed  JSON DEFAULT NULL,
    courses_burst      JSON DEFAULT NULL,
    students_confirmed INT DEFAULT 0,
    students_in_pool   INT DEFAULT 0,
    capacity_settings  JSON DEFAULT NULL,
    notes              TEXT DEFAULT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_election_round (election_id, round_number),
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_election (election_id)
);

-- ── 9. FINAL ASSIGNMENTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS final_assignments (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id    INT NOT NULL,
    election_id   INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_election (student_id, election_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE
);

-- ── 10. ASSIGNMENT DETAILS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_details (
    detail_id     INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    slot_number   INT NOT NULL,
    course_id     INT NOT NULL,
    seat_id       INT NOT NULL,
    token_id      INT NOT NULL,
    round_number  INT NOT NULL,
    FOREIGN KEY (assignment_id) REFERENCES final_assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id),
    FOREIGN KEY (token_id) REFERENCES student_tokens(token_id)
);

-- ── 11. ELECTION CAV (Code + Access + Verification) ──────────
CREATE TABLE IF NOT EXISTS election_cav (
    cav_id         INT PRIMARY KEY AUTO_INCREMENT,
    election_id    INT NOT NULL UNIQUE,
    election_code  VARCHAR(12) NOT NULL UNIQUE,
    join_link      VARCHAR(255) NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    expires_at     TIMESTAMP NULL DEFAULT NULL,
    generated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_code (election_code)
);

-- ── 12. ELECTION PARTICIPANTS (self-applied via link) ─────────
CREATE TABLE IF NOT EXISTS election_participants (
    participant_id  INT PRIMARY KEY AUTO_INCREMENT,
    election_id     INT NOT NULL,
    student_id      INT NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    name_updated    BOOLEAN DEFAULT FALSE,
    applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING','CONFIRMED','REJECTED') DEFAULT 'PENDING',
    confirmed_at    TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_student_election (student_id, election_id),
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_election (election_id),
    INDEX idx_status (status)
);

-- ── 13. ELECTION MESSAGES (expiring notifications) ────────────
CREATE TABLE IF NOT EXISTS election_messages (
    message_id   INT PRIMARY KEY AUTO_INCREMENT,
    election_id  INT NOT NULL,
    student_id   INT NOT NULL,
    message_type ENUM('CONFIRMATION','REJECTION','INFO','RESULT') DEFAULT 'INFO',
    title        VARCHAR(150) NOT NULL,
    body         TEXT NOT NULL,
    is_read      BOOLEAN DEFAULT FALSE,
    expires_at   TIMESTAMP NULL DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_election (election_id)
);

-- ── 14. ELECTION CHOICE RESULTS (immutable snapshot at stop) ──
-- Locked automatically when election stops. Never modified after.
CREATE TABLE IF NOT EXISTS election_choice_results (
    result_id        INT PRIMARY KEY AUTO_INCREMENT,
    election_id      INT NOT NULL,
    student_id       INT NOT NULL,
    token_number     INT NOT NULL,            -- T1/T2/T3...
    course_id        INT NOT NULL,
    original_status  VARCHAR(20) NOT NULL,    -- BOOKED/CONFIRMED/BURST/AUTO/UNUSED
    is_auto_assigned BOOLEAN DEFAULT FALSE,
    seat_id          INT DEFAULT NULL,
    round_confirmed  INT DEFAULT NULL,
    token_code       VARCHAR(35) NOT NULL,
    locked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_result_token (election_id, student_id, token_number),
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    INDEX idx_election (election_id),
    INDEX idx_student (student_id)
);

-- ── 15. ALLOCATION SESSIONS (named, versioned allocation work) ─
-- Admin creates named sessions, can have many per election.
-- Each session is independent. Only one can be marked final.
CREATE TABLE IF NOT EXISTS allocation_sessions (
    session_id    INT PRIMARY KEY AUTO_INCREMENT,
    election_id   INT NOT NULL,
    session_name  VARCHAR(100) NOT NULL,
    notes         TEXT DEFAULT NULL,
    is_final      BOOLEAN DEFAULT FALSE,       -- only 1 per election can be final
    finalized_at  TIMESTAMP NULL DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_election (election_id)
);

-- ── 16. ALLOCATION SESSION OVERRIDES (per-student adjustments) ─
-- Admin can move students between courses within a session.
-- If no override exists, the choice result is used as-is.
CREATE TABLE IF NOT EXISTS allocation_overrides (
    override_id    INT PRIMARY KEY AUTO_INCREMENT,
    session_id     INT NOT NULL,
    election_id    INT NOT NULL,
    student_id     INT NOT NULL,
    token_number   INT NOT NULL,
    course_id      INT NOT NULL,              -- new course assignment
    reason         TEXT DEFAULT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_override (session_id, student_id, token_number),
    FOREIGN KEY (session_id) REFERENCES allocation_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- ── 17. ALLOCATION STEPS (abacus alter-table history) ──────────
-- Each burst/confirm action during allocation is recorded as a step.
-- The frontend renders these as sequential table snapshots.
CREATE TABLE IF NOT EXISTS allocation_steps (
    step_id       INT PRIMARY KEY AUTO_INCREMENT,
    election_id   INT NOT NULL,
    step_number   INT NOT NULL,
    action_type   ENUM('BURST','CONFIRM','OVERRIDE','NOTE') NOT NULL,
    course_id     INT DEFAULT NULL,
    course_name   VARCHAR(100) DEFAULT NULL,
    reason        TEXT DEFAULT NULL,
    cascade_count INT DEFAULT 0,
    confirm_count INT DEFAULT 0,
    snapshot_json LONGTEXT DEFAULT NULL,   -- full table state at this step
    created_by    VARCHAR(20) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_election_step (election_id, step_number)
);

-- ── ALTER: Add field_config to elections (controls visible fields on join page) ──
ALTER TABLE elections ADD COLUMN IF NOT EXISTS
  field_config JSON DEFAULT NULL COMMENT 'Controls which student fields are public on the join page';

ALTER TABLE students ADD COLUMN IF NOT EXISTS
  force_password_change BOOLEAN DEFAULT TRUE AFTER is_verified;

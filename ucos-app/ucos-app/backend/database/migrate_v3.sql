-- ============================================================
-- UCOS v3 Migration — run this if upgrading from v2
-- (schema.sql already contains all tables including new ones)
-- ============================================================
USE ucos_db;

-- ── 11. ELECTION CAV ─────────────────────────────────────────
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

-- ── 12. ELECTION PARTICIPANTS ─────────────────────────────────
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

-- ── 13. ELECTION MESSAGES ─────────────────────────────────────
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

SELECT 'Migration complete. 3 new tables created.' as status;

-- ── 17. ALLOCATION STEPS ──────────────────────────────────────
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
    snapshot_json LONGTEXT DEFAULT NULL,
    created_by    VARCHAR(20) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(election_id) ON DELETE CASCADE,
    INDEX idx_election_step (election_id, step_number)
);

-- ── Alter elections: add field_config ──────────────────────────
ALTER TABLE elections ADD COLUMN IF NOT EXISTS
  field_config JSON DEFAULT NULL COMMENT 'e.g. {"register_number":"public","section":"public","email":"private"}';

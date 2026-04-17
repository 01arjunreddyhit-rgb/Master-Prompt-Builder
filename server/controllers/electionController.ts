import pool from '../config/db';
import { expireCAV  } from './cavController';
import { lockChoiceResults  } from './resultController';

const buildTokenCode = (registerNumber, electionId, tokenNumber) => `A${registerNumber}-E${electionId}-T${tokenNumber}`;

// helper — silently generate CAV after election create
async function silentGenerateCAV(election_id) {
  try {
    const crypto = await import('crypto');
    const code = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : (process.env.FRONTEND_URL || 'http://localhost:3000');
    const join_link = `${baseUrl}/join/${code}`;
    await pool.execute(
      'INSERT INTO election_cav (election_id, election_code, join_link) VALUES (?, ?, ?) ON CONFLICT (election_id) DO NOTHING',
      [election_id, code, join_link]
    );
  } catch (e) { console.warn('CAV auto-gen failed:', e.message); }
}

// ── CREATE ELECTION ───────────────────────────────────────────
const createElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const {
      election_name, semester_tag, batch_tag,
      final_courses_per_student = 2, faculty_count = 4,
      min_class_size = 45, max_class_size = 75,
      field_config = null,   // { register_number: 'public'|'private', section: 'public'|'private', email: 'public'|'private' }
    } = req.body;

    if (!election_name) return res.status(400).json({ success: false, message: 'election_name required.' });

    // Check no active election
    const [active] = await pool.execute(
      "SELECT election_id FROM elections WHERE admin_id=? AND status IN ('NOT_STARTED','ACTIVE','PAUSED')",
      [admin_id]
    );
    if (active.length) {
      return res.status(400).json({ success: false, message: 'You already have an active election. Stop it before creating a new one.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO elections
       (admin_id, election_name, semester_tag, batch_tag, final_courses_per_student,
        faculty_count, min_class_size, max_class_size, field_config)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [admin_id, election_name, semester_tag || null, batch_tag || null,
       final_courses_per_student, faculty_count, min_class_size, max_class_size,
       field_config ? JSON.stringify(field_config) : null]
    );

    const newId = result.insertId;
    await silentGenerateCAV(newId);
    res.status(201).json({ success: true, message: 'Election created.', election_id: newId });
  } catch (err) {
    console.error('createElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── UPDATE ELECTION (before start only) ───────────────────────
const updateElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { election_name, semester_tag, batch_tag, final_courses_per_student, faculty_count, min_class_size, max_class_size, field_config } = req.body;

    const [rows] = await pool.execute(
      "SELECT election_id, status FROM elections WHERE election_id=? AND admin_id=?",
      [election_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (rows[0].status !== 'NOT_STARTED') {
      return res.status(400).json({ success: false, message: 'Election can only be edited before it starts.' });
    }

    await pool.execute(
      `UPDATE elections SET
         election_name = COALESCE(?, election_name),
         semester_tag  = COALESCE(?, semester_tag),
         batch_tag     = COALESCE(?, batch_tag),
         final_courses_per_student = COALESCE(?, final_courses_per_student),
         faculty_count = COALESCE(?, faculty_count),
         min_class_size = COALESCE(?, min_class_size),
         max_class_size = COALESCE(?, max_class_size),
         field_config  = COALESCE(?, field_config)
       WHERE election_id=?`,
      [election_name || null, semester_tag || null, batch_tag || null,
       final_courses_per_student ? parseInt(final_courses_per_student) : null,
       faculty_count ? parseInt(faculty_count) : null,
       min_class_size ? parseInt(min_class_size) : null,
       max_class_size ? parseInt(max_class_size) : null,
       field_config ? JSON.stringify(field_config) : null,
       election_id]
    );
    res.json({ success: true, message: 'Election updated.' });
  } catch (err) {
    console.error('updateElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ELECTIONS ─────────────────────────────────────────────
const getElections = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const [rows] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM students s WHERE s.admin_id=e.admin_id AND s.election_id=e.election_id) as student_count,
              (SELECT COUNT(*) FROM courses c WHERE c.election_id=e.election_id AND c.is_active=TRUE) as course_count
       FROM elections e
       WHERE e.admin_id=?
       ORDER BY e.created_at DESC`,
      [admin_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ELECTION STATUS ───────────────────────────────────────
const getElectionStatus = async (req, res) => {
  try {
    const { election_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM students WHERE election_id=e.election_id) as total_students,
              (SELECT COUNT(*) FROM courses WHERE election_id=e.election_id AND is_active=TRUE) as active_courses,
              (SELECT COUNT(*) FROM seats WHERE election_id=e.election_id AND is_available=FALSE) as total_bookings,
              (SELECT COUNT(DISTINCT student_id) FROM student_tokens
               WHERE election_id=e.election_id AND status NOT IN ('UNUSED')) as students_started
       FROM elections e WHERE e.election_id=?`,
      [election_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── PRE-START CHECKLIST ───────────────────────────────────────
const getChecklist = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [students] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM students WHERE admin_id=? AND election_id=?',
      [admin_id, election_id]
    );
    const [courses] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE',
      [election_id]
    );
    const [tokens] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM student_tokens WHERE election_id=?',
      [election_id]
    );
    const [seats] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM seats WHERE election_id=?',
      [election_id]
    );

    const studentCount = students[0].cnt;
    const courseCount = courses[0].cnt;
    const tokenCount = tokens[0].cnt;
    const seatCount = seats[0].cnt;
    const expectedTokens = studentCount * courseCount;
    const expectedSeats = studentCount * courseCount;

    const checklist = {
      students: { ok: studentCount > 0, count: studentCount, label: 'Students registered' },
      courses: { ok: courseCount > 0, count: courseCount, label: 'Active courses created' },
      tokens: { ok: tokenCount >= expectedTokens && expectedTokens > 0, count: tokenCount, expected: expectedTokens, label: 'Tokens generated' },
      seats: { ok: seatCount >= expectedSeats && expectedSeats > 0, count: seatCount, expected: expectedSeats, label: 'Seats initialised' },
    };

    const allReady = Object.values(checklist).every(c => c.ok);
    res.json({ success: true, checklist, allReady, election: elections[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── INITIALISE SEATS + TOKENS ─────────────────────────────────
const initElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await conn.execute(
      "SELECT * FROM elections WHERE election_id=? AND admin_id=? AND status='NOT_STARTED'",
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found or already started.' });

    const [students] = await conn.execute(
      'SELECT student_id, register_number FROM students WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    const [courses] = await conn.execute(
      'SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE',
      [election_id]
    );

    if (!students.length) return res.status(400).json({ success: false, message: 'No students found for this election.' });
    if (!courses.length) return res.status(400).json({ success: false, message: 'No active courses found.' });

    await conn.beginTransaction();

    // Clear existing tokens and seats for this election
    await conn.execute('DELETE FROM seats WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM student_tokens WHERE election_id=?', [election_id]);

    const totalSeats = students.length * courses.length;

    // Create global seat pool
    for (let i = 1; i <= totalSeats; i++) {
      const seat_code = `S-${String(i).padStart(4, '0')}`;
      await conn.execute(
        'INSERT INTO seats (seat_number, seat_code, election_id, is_available) VALUES (?,?,?,TRUE)',
        [i, seat_code, election_id]
      );
    }

    // Generate tokens for each student
    for (const student of students) {
      for (let t = 1; t <= courses.length; t++) {
        const token_code = buildTokenCode(student.register_number, election_id, t);
        await conn.execute(
          'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
          [student.student_id, election_id, t, token_code]
        );
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: `Initialised: ${totalSeats} seats + ${students.length * courses.length} tokens generated.`,
      seats_created: totalSeats,
      tokens_created: students.length * courses.length,
    });
  } catch (err) {
    await conn.rollback();
    console.error('initElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── START ELECTION ────────────────────────────────────────────
const startElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [rows] = await pool.execute(
      "SELECT * FROM elections WHERE election_id=? AND admin_id=? AND status='NOT_STARTED'",
      [election_id, admin_id]
    );
    if (!rows.length) return res.status(400).json({ success: false, message: 'Election not found or already started.' });

    await pool.execute(
      "UPDATE elections SET status='ACTIVE', window_start=NOW() WHERE election_id=?",
      [election_id]
    );

    res.json({ success: true, message: 'Election started. Students can now book seats.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── PAUSE ELECTION ────────────────────────────────────────────
const pauseElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    await pool.execute(
      "UPDATE elections SET status='PAUSED' WHERE election_id=? AND admin_id=? AND status='ACTIVE'",
      [election_id, admin_id]
    );
    res.json({ success: true, message: 'Election paused.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── RESUME ELECTION ───────────────────────────────────────────
const resumeElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    await pool.execute(
      "UPDATE elections SET status='ACTIVE' WHERE election_id=? AND admin_id=? AND status='PAUSED'",
      [election_id, admin_id]
    );
    res.json({ success: true, message: 'Election resumed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── STOP ELECTION ─────────────────────────────────────────────
const stopElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [rows] = await conn.execute(
      "SELECT * FROM elections WHERE election_id=? AND admin_id=? AND status IN ('ACTIVE','PAUSED')",
      [election_id, admin_id]
    );
    if (!rows.length) return res.status(400).json({ success: false, message: 'Election not found or not active.' });

    await conn.beginTransaction();

    // AUTO-ASSIGN non-participants
    const [students] = await conn.execute(
      'SELECT DISTINCT student_id, register_number FROM students WHERE election_id=?',
      [election_id]
    );

    const [activeCourses] = await conn.execute(
      'SELECT course_id, course_name FROM courses WHERE election_id=? AND is_active=TRUE AND is_burst=FALSE ORDER BY course_name ASC',
      [election_id]
    );

    let autoAssigned = 0;

    for (const student of students) {
      // Find unused tokens
      const [unusedTokens] = await conn.execute(
        "SELECT * FROM student_tokens WHERE student_id=? AND election_id=? AND status='UNUSED' ORDER BY token_number ASC",
        [student.student_id, election_id]
      );
      if (!unusedTokens.length) continue;

      // Find courses not yet booked by this student
      const [bookedCourseIds] = await conn.execute(
        "SELECT DISTINCT course_id FROM student_tokens WHERE student_id=? AND election_id=? AND course_id IS NOT NULL",
        [student.student_id, election_id]
      );
      const bookedIds = bookedCourseIds.map(r => r.course_id);
      const remaining = activeCourses.filter(c => !bookedIds.includes(c.course_id));

      for (let i = 0; i < unusedTokens.length && i < remaining.length; i++) {
        // Get highest available seat (non-participants go to back)
        const [seats] = await conn.execute(
          'SELECT * FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number DESC LIMIT 1',
          [election_id]
        );
        if (!seats.length) continue;

        const seat = seats[0];
        const token = unusedTokens[i];
        const course = remaining[i];

        await conn.execute(
          'UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?',
          [course.course_id, token.token_id, seat.seat_id]
        );
        await conn.execute(
          "UPDATE student_tokens SET status='AUTO', course_id=?, seat_id=?, timestamp_booked=NOW(), is_auto_assigned=TRUE WHERE token_id=?",
          [course.course_id, seat.seat_id, token.token_id]
        );
        autoAssigned++;
      }
    }

    await conn.execute(
      "UPDATE elections SET status='STOPPED', window_end=NOW() WHERE election_id=?",
      [election_id]
    );

    await conn.commit();

    // Expire CAV & messages (non-blocking)
    expireCAV(election_id).catch(() => {});

    // MANDATORY: Lock choice results snapshot (immutable record of what students chose)
    lockChoiceResults(election_id).catch(e => console.error('lockChoiceResults failed:', e));

    res.json({ success: true, message: `Election stopped. ${autoAssigned} tokens auto-assigned. Results locked.`, autoAssigned });
  } catch (err) {
    await conn.rollback();
    console.error('stopElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

export { createElection, updateElection, getElections, getElectionStatus, getChecklist,
  initElection, startElection, pauseElection, resumeElection, stopElection,
 };

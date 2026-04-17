import pool from '../config/db';
import { expireCAV } from './cavController';
import { lockChoiceResults } from './resultController';

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
      field_config = null,
    } = req.body;

    if (!election_name) return res.status(400).json({ success: false, message: 'election_name required.' });

    const [elecs] = await pool.execute(
      "SELECT election_id FROM elections WHERE admin_id=?",
      [admin_id]
    );
    if (elecs.length >= 50) {
      return res.status(400).json({ success: false, message: 'Maximum limit of 50 elections reached. Please delete an old one.' });
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

// ── UPDATE ELECTION ───────────────────────────────────────────
const updateElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { election_name, semester_tag, batch_tag, final_courses_per_student, faculty_count, min_class_size, max_class_size, field_config } = req.body;

    const [rows] = await pool.execute(
      "SELECT status FROM elections WHERE election_id=? AND admin_id=?",
      [election_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (rows[0].status !== 'NOT_STARTED') return res.status(400).json({ success: false, message: 'Cannot edit started election.' });

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
       final_courses_per_student || null, faculty_count || null, min_class_size || null, max_class_size || null,
       field_config ? JSON.stringify(field_config) : null, election_id]
    );
    res.json({ success: true, message: 'Election updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ELECTIONS ─────────────────────────────────────────────
const getElections = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, cav.election_code,
              (SELECT COUNT(*) FROM students s WHERE s.election_id=e.election_id) as student_count,
              (SELECT COUNT(*) FROM courses c WHERE c.election_id=e.election_id AND c.is_active=TRUE) as course_count
       FROM elections e 
       LEFT JOIN election_cav cav ON cav.election_id = e.election_id
       WHERE e.admin_id=? ORDER BY e.created_at DESC`,
      [req.user.id]
    );

    // Silent Migration: If any election lacks a CAV, generate it now
    for (const e of rows) {
      if (!e.election_code) {
        silentGenerateCAV(e.election_id).catch(() => {});
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET STATUS ────────────────────────────────────────────────
const getElectionStatus = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM students WHERE election_id=e.election_id) as total_students,
              (SELECT COUNT(*) FROM courses WHERE election_id=e.election_id AND is_active=TRUE) as active_courses,
              (SELECT COUNT(*) FROM seats WHERE election_id=e.election_id AND is_available=FALSE) as total_bookings
       FROM elections e WHERE e.election_id=?`,
      [req.params.election_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET CHECKLIST ─────────────────────────────────────────────
const getChecklist = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elections] = await pool.execute('SELECT * FROM elections WHERE election_id=?', [election_id]);
    const [students]  = await pool.execute('SELECT COUNT(*) as cnt FROM students WHERE election_id=?', [election_id]);
    const [courses]   = await pool.execute('SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);
    const [tokens]    = await pool.execute('SELECT COUNT(*) as cnt FROM student_tokens WHERE election_id=?', [election_id]);
    const [seats]     = await pool.execute('SELECT COUNT(*) as cnt FROM seats WHERE election_id=?', [election_id]);

    const sc = students[0].cnt;
    const cc = courses[0].cnt;
    const tc = tokens[0].cnt;
    const st = seats[0].cnt;

    const checklist = {
      students: { ok: sc > 0, count: sc, label: 'Students registered' },
      courses:  { ok: cc > 0, count: cc, label: 'Active courses created' },
      tokens:   { ok: tc >= (sc * cc) && sc*cc > 0, count: tc, expected: sc*cc, label: 'Tokens generated' },
      seats:    { ok: st >= (sc * cc) && sc*cc > 0, count: st, expected: sc*cc, label: 'Seats initialised' },
    };

    res.json({ success: true, checklist, allReady: Object.values(checklist).every(c => c.ok), election: elections[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── INITIALISE ────────────────────────────────────────────────
const initElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id } = req.params;
    await conn.beginTransaction();

    const [students] = await conn.execute('SELECT student_id, register_number FROM students WHERE election_id=?', [election_id]);
    const [courses]  = await conn.execute('SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);

    if (!students.length || !courses.length) throw new Error('Students or courses missing.');

    await conn.execute('DELETE FROM seats WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM student_tokens WHERE election_id=?', [election_id]);

    const total = students.length * courses.length;
    for (let i = 1; i <= total; i++) {
      await conn.execute('INSERT INTO seats (seat_number, seat_code, election_id, is_available) VALUES (?,?,?,TRUE)', [i, `S-${String(i).padStart(4,'0')}`, election_id]);
    }
    for (const s of students) {
      for (let t = 1; t <= courses.length; t++) {
        await conn.execute('INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)', [s.student_id, election_id, t, buildTokenCode(s.register_number, election_id, t)]);
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Initialised.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── START ─────────────────────────────────────────────────────
const startElection = async (req, res) => {
  try {
    await pool.execute("UPDATE elections SET status='ACTIVE', window_start=NOW(), is_paused=FALSE WHERE election_id=? AND status='NOT_STARTED'", [req.params.election_id]);
    res.json({ success: true, message: 'Started.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── PAUSE ─────────────────────────────────────────────────────
const pauseElection = async (req, res) => {
  try {
    await pool.execute("UPDATE elections SET is_paused=TRUE WHERE election_id=? AND status='ACTIVE'", [req.params.election_id]);
    res.json({ success: true, message: 'Paused.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── RESUME ────────────────────────────────────────────────────
const resumeElection = async (req, res) => {
  try {
    await pool.execute("UPDATE elections SET is_paused=FALSE WHERE election_id=? AND status='ACTIVE'", [req.params.election_id]);
    res.json({ success: true, message: 'Resumed.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── STOP ──────────────────────────────────────────────────────
const stopElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id } = req.params;
    await conn.beginTransaction();

    const [active] = await conn.execute('SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE AND is_burst=FALSE', [election_id]);
    const [students] = await conn.execute('SELECT student_id FROM students WHERE election_id=?', [election_id]);

    for (const s of students) {
      const [unused] = await conn.execute("SELECT * FROM student_tokens WHERE student_id=? AND status='UNUSED' ORDER BY token_number ASC", [s.student_id]);
      const [booked] = await conn.execute("SELECT course_id FROM student_tokens WHERE student_id=? AND course_id IS NOT NULL", [s.student_id]);
      const bookedIds = booked.map(b => b.course_id);
      const remaining = active.filter(c => !bookedIds.includes(c.course_id));

      for (let i = 0; i < unused.length && i < remaining.length; i++) {
        const [seats] = await conn.execute('SELECT seat_id FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number DESC LIMIT 1', [election_id]);
        if (!seats.length) break;
        await conn.execute('UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?', [remaining[i].course_id, unused[i].token_id, seats[0].seat_id]);
        await conn.execute("UPDATE student_tokens SET status='AUTO', course_id=?, seat_id=?, is_auto_assigned=TRUE WHERE token_id=?", [remaining[i].course_id, seats[0].seat_id, unused[i].token_id]);
      }
    }

    await conn.execute("UPDATE elections SET status='STOPPED', window_end=NOW(), is_paused=FALSE WHERE election_id=?", [election_id]);
    await conn.commit();
    expireCAV(election_id).catch(()=>{});
    lockChoiceResults(election_id).catch(()=>{});
    res.json({ success: true, message: 'Stopped.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error.' });
  } finally {
    conn.release();
  }
};

// ── DELETE ELECTION (WITH CODE SAFETY) ────────────────────────
const deleteElection = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id } = req.params;
    const { confirm_code } = req.body;
    const admin_id = req.user.id;

    await conn.beginTransaction();

    // Verify code
    const [cav] = await conn.execute('SELECT election_code FROM election_cav WHERE election_id=?', [election_id]);
    if (!cav.length || cav[0].election_code !== confirm_code) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Invalid election code. Deletion aborted.' });
    }

    // Cascading delete
    await conn.execute('DELETE FROM seats WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM student_tokens WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM courses WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM election_cav WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM election_results_lock WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM elections WHERE election_id=? AND admin_id=?', [election_id, admin_id]);

    await conn.commit();
    res.json({ success: true, message: 'Election deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error deleting.' });
  } finally {
    conn.release();
  }
};

// ── SEARCH ELECTIONS (FOR STUDENTS) ──────────────────────────
const searchElections = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const [rows] = await pool.execute(
      `SELECT e.election_id, e.election_name, e.semester_tag, e.status, 
              a.admin_name, a.college_name, cav.election_code
       FROM elections e
       JOIN admins a ON e.admin_id = a.admin_id
       JOIN election_cav cav ON e.election_id = cav.election_id
       WHERE (e.election_name LIKE ? OR a.admin_name LIKE ? OR a.college_name LIKE ?)
       AND e.status != 'STOPPED'
       LIMIT 20`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
};

// ── GET ADMIN PUBLIC PROFILE ──────────────────────────────────
const getAdminProfile = async (req, res) => {
  try {
    const { admin_id } = req.params;
    const [admin] = await pool.execute('SELECT admin_name, college_name FROM admins WHERE admin_id=?', [admin_id]);
    if (!admin.length) return res.status(404).json({ success: false, message: 'Admin not found.' });

    const [elecs] = await pool.execute(
      `SELECT e.election_id, e.election_name, e.semester_tag, e.status, cav.election_code
       FROM elections e
       JOIN election_cav cav ON e.election_id = cav.election_id
       WHERE e.admin_id=? AND e.status != 'STOPPED'`,
      [admin_id]
    );
    res.json({ success: true, admin: admin[0], elections: elecs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { 
  createElection, updateElection, getElections, getElectionStatus, getChecklist, 
  initElection, startElection, pauseElection, resumeElection, stopElection, deleteElection,
  searchElections, getAdminProfile
};

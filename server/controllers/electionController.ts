import pool from '../config/db';
import { expireCAV } from './cavController';
import { lockChoiceResults } from './resultController';
import csv from 'csv-parser';
import { Readable } from 'stream';

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
      field_config = null,
      // Allocation params (min/max class, faculty, courses per student) are
      // intentionally NOT accepted here — configured in Allocation Panel post-init.
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
       (admin_id, election_name, semester_tag, batch_tag, field_config)
       VALUES (?,?,?,?,?)`,
      [admin_id, election_name, semester_tag || null, batch_tag || null,
       field_config ? JSON.stringify(field_config) : null]
    );

    const newId = result.insertId;
    await silentGenerateCAV(newId);

    // Return full election row so frontend can auto-select it
    const [rows] = await pool.execute(
      `SELECT e.*, cav.election_code FROM elections e
       LEFT JOIN election_cav cav ON cav.election_id = e.election_id
       WHERE e.election_id=?`, [newId]
    );
    res.status(201).json({ success: true, message: 'Election created.', election_id: newId, election: rows[0] || null });
  } catch (err) {
    console.error('createElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── COPY ELECTION ─────────────────────────────────────────────
const copyElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { source_election_id } = req.params;
    const { election_name } = req.body;
    if (!election_name?.trim()) return res.status(400).json({ success: false, message: 'New election name required.' });

    const [src] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [source_election_id, admin_id]
    );
    if (!src.length) return res.status(404).json({ success: false, message: 'Source election not found.' });
    const s = src[0];

    const [elecs] = await pool.execute('SELECT election_id FROM elections WHERE admin_id=?', [admin_id]);
    if (elecs.length >= 50) return res.status(400).json({ success: false, message: 'Election limit reached.' });

    const [result] = await pool.execute(
      `INSERT INTO elections (admin_id, election_name, semester_tag, batch_tag, field_config)
       VALUES (?,?,?,?,?)`,
      [admin_id, election_name.trim(), s.semester_tag, s.batch_tag,
       s.field_config ? (typeof s.field_config === 'string' ? s.field_config : JSON.stringify(s.field_config)) : null]
    );
    const newId = result.insertId;
    await silentGenerateCAV(newId);

    // Copy courses from source
    const [srcCourses] = await pool.execute(
      'SELECT * FROM courses WHERE election_id=? AND is_active=TRUE', [source_election_id]
    );
    for (const c of srcCourses) {
      await pool.execute(
        `INSERT INTO courses (election_id, course_name, subject_code, description, credit_weight)
         VALUES (?,?,?,?,?)`,
        [newId, c.course_name, c.subject_code, c.description, c.credit_weight]
      );
    }

    const [rows] = await pool.execute(
      `SELECT e.*, cav.election_code FROM elections e
       LEFT JOIN election_cav cav ON cav.election_id = e.election_id
       WHERE e.election_id=?`, [newId]
    );
    res.status(201).json({ success: true, message: `Election copied from "${s.election_name}" with ${srcCourses.length} courses.`, election_id: newId, election: rows[0] || null });
  } catch (err) {
    console.error('copyElection error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── SCHEDULE ELECTION (set window_start / window_end) ─────────
const scheduleElection = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { window_start, window_end } = req.body;
    if (!window_start || !window_end) return res.status(400).json({ success: false, message: 'Both window_start and window_end are required.' });
    if (new Date(window_end) <= new Date(window_start)) return res.status(400).json({ success: false, message: 'End time must be after start time.' });

    const [rows] = await pool.execute('SELECT status FROM elections WHERE election_id=? AND admin_id=?', [election_id, admin_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (rows[0].status !== 'NOT_STARTED') return res.status(400).json({ success: false, message: 'Can only schedule a NOT_STARTED election.' });

    await pool.execute(
      'UPDATE elections SET window_start=?, window_end=?, scheduled_mode=TRUE WHERE election_id=?',
      [new Date(window_start), new Date(window_end), election_id]
    );
    res.json({ success: true, message: 'Schedule saved. Election will auto-start and auto-stop at the specified times.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET INVITEES ──────────────────────────────────────────────
const getInvitees = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM election_email_invites WHERE election_id=? AND admin_id=? ORDER BY created_at ASC',
      [election_id, admin_id]
    );
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── SAVE INVITEES (bulk email list) ───────────────────────────
const saveInvitees = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { emails } = req.body; // array of email strings
    if (!Array.isArray(emails)) return res.status(400).json({ success: false, message: 'emails must be an array.' });

    await conn.beginTransaction();
    let added = 0;
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      await conn.execute(
        `INSERT INTO election_email_invites (election_id, admin_id, email, is_invited)
         VALUES (?,?,?,TRUE)
         ON CONFLICT ON CONSTRAINT election_email_invites_unique DO NOTHING`,
        [election_id, admin_id, email]
      );
      added++;
    }
    await conn.execute('UPDATE elections SET invitee_count=(SELECT COUNT(*) FROM election_email_invites WHERE election_id=?) WHERE election_id=?', [election_id, election_id]);
    await conn.commit();
    res.json({ success: true, message: `${added} invitee email(s) saved.`, added });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally { conn.release(); }
};

// ── UPLOAD INSTITUTION CSV (Q2: Invite List — triggers Pool Calc popup) ────
const uploadInstitutionCSV = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });

    const rows = [];
    let headers = [];
    const stream = Readable.from(req.file.buffer.toString());
    await new Promise((resolve, reject) => {
      stream.pipe(csv())
        .on('headers', (h) => { headers = h.map(x => x.trim().toLowerCase()); })
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (!headers.includes('email')) {
      return res.status(400).json({ success: false, message: 'The CSV must include an "email" column.' });
    }

    // Q2: Schema alignment preview — returned BEFORE committing
    // Caller uses ?preview=true to get this without writing anything
    if (req.query.preview === 'true') {
      const [courses] = await pool.execute(
        'SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]
      );
      const cc = Number(courses[0].cnt);
      const ic = rows.filter(r => r.email?.trim()).length;
      return res.json({
        success: true, preview: true, headers,
        sample: rows.slice(0, 3),
        // Q2: Pool preview included in the schema alignment response
        pool_preview: {
          invite_count: ic,
          course_count: cc,
          universal_pool: ic * cc,
          tokens_per_student: cc,
          formula: `${ic} invitees × ${cc} subjects = ${ic * cc} total seats`,
        },
      });
    }

    await conn.beginTransaction();
    let updated = 0;
    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      if (!email) continue;
      // Extract platform_id_given and username_given if admin included them in CSV
      const platform_id_given = row.platform_id || row.full_student_id || null;
      const username_given    = row.username || row.register_number || null;
      const metadata = JSON.stringify(row);

      const [existing] = await conn.execute(
        'SELECT invite_id FROM election_email_invites WHERE election_id=? AND email=?',
        [election_id, email]
      );
      if (existing.length) {
        await conn.execute(
          'UPDATE election_email_invites SET metadata_json=?, platform_id_given=?, username_given=? WHERE election_id=? AND email=?',
          [metadata, platform_id_given, username_given, election_id, email]
        );
      } else {
        await conn.execute(
          `INSERT INTO election_email_invites (election_id, admin_id, email, metadata_json, is_invited, platform_id_given, username_given)
           VALUES (?,?,?,?,TRUE,?,?)`,
          [election_id, admin_id, email, metadata, platform_id_given, username_given]
        );
      }
      updated++;
    }

    await conn.execute(
      'UPDATE elections SET invitee_count=(SELECT COUNT(*) FROM election_email_invites WHERE election_id=?) WHERE election_id=?',
      [election_id, election_id]
    );
    await conn.commit();

    // Q2: After commit, also return the pool calculation so frontend can show the Pool Confirmation Popup
    const [courses] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]
    );
    const cc = Number(courses[0].cnt);

    res.json({
      success: true,
      message: `Eligible Participant List saved — ${updated} email(s) linked.`,
      updated,
      headers,
      field_keys: headers.filter(h => !['email', 'platform_id', 'full_student_id', 'username', 'register_number'].includes(h)),
      // Q2: Pool Confirmation data — frontend shows the popup with this
      pool_confirmation: {
        invite_count: updated,
        course_count: cc,
        universal_pool: updated * cc,
        tokens_per_student: cc,
        formula: `${updated} invitees × ${cc} subjects = ${updated * cc} total seats`,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('uploadInstitutionCSV error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally { conn.release(); }
};

// ── SAVE INVITE FIELD CONFIG (admin defines column schema before CSV upload) ──
const saveInviteFieldConfig = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { fields } = req.body; // array of { key, label, required, type }
    if (!Array.isArray(fields)) return res.status(400).json({ success: false, message: 'fields must be an array.' });
    await pool.execute(
      'UPDATE elections SET invite_field_config=? WHERE election_id=? AND admin_id=?',
      [JSON.stringify(fields), election_id, admin_id]
    );
    res.json({ success: true, message: 'Field configuration saved.', fields });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET POOL CALCULATION (Q2: based on invite_count × courses) ──────────────
// Note: pool is determined by INVITE LIST count, not enrolled student count
const getPoolCalculation = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elec]    = await pool.execute('SELECT invitee_count FROM elections WHERE election_id=?', [election_id]);
    const [courses] = await pool.execute('SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);
    const ic = Number(elec[0]?.invitee_count || 0);
    const cc = Number(courses[0].cnt);
    res.json({
      success: true,
      invite_count: ic,
      course_count: cc,
      tokens_per_student: cc,
      universal_pool: ic * cc,
      formula: `${ic} invitees × ${cc} subjects = ${ic * cc} total seats`,
    });
  } catch (err) {
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
// ── GET CHECKLIST ─────────────────────────────────────────────
const getChecklist = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elections] = await pool.execute('SELECT * FROM elections WHERE election_id=?', [election_id]);
    // Count approved students
    const [students] = await pool.execute('SELECT COUNT(*) as cnt FROM students WHERE election_id=? AND is_approved=TRUE', [election_id]);
    const [courses] = await pool.execute('SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);
    const [tokens] = await pool.execute('SELECT COUNT(*) as cnt FROM student_tokens WHERE election_id=?', [election_id]);
    const [seats] = await pool.execute('SELECT COUNT(*) as cnt FROM seats WHERE election_id=?', [election_id]);

    const sc = Number(students[0].cnt);
    const cc = Number(courses[0].cnt);
    const tc = Number(tokens[0].cnt);
    const st = Number(seats[0].cnt);
    const ec = elections[0];
    const slotCap = ec.universal_slot_cap || 10000;

    const checklist = {
      students: { ok: true, count: sc, label: 'Gate 1: Student Database (Enrolled)' },
      courses:  { ok: cc > 0, count: cc, label: 'Gate 2: Active Subjects' },
      tokens:   { ok: tc >= (sc * cc) && sc > 0, count: tc, expected: sc * cc, label: 'Gate 3: Tokens Issued (Enrolled)' },
      seats:    { ok: st >= slotCap, count: st, expected: slotCap, label: 'Gate 4: Universal Slot Pool' },
    };

    res.json({ success: true, checklist, allReady: Object.values(checklist).every(c => c.ok), election: ec });
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

    const [students] = await conn.execute('SELECT student_id, register_number FROM students WHERE election_id=? AND is_approved=TRUE', [election_id]);
    const [courses] = await conn.execute('SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);

    if (!courses.length) throw new Error('Courses missing. Create at least one subject before initialising.');
    if (!students.length) throw new Error('No enrolled students found. Please approve students before initialising.');

    const SLOT_CAP = 10000;

    // 1. Clear existing pre-start assets
    await conn.execute('DELETE FROM seats WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM student_tokens WHERE election_id=?', [election_id]);

    // 2. Batch insert 10,000 slots
    const batchSize = 1000;
    for (let i = 1; i <= SLOT_CAP; i += batchSize) {
      const placeholders = [];
      const values = [];
      const end = Math.min(i + batchSize - 1, SLOT_CAP);
      for (let j = i; j <= end; j++) {
        placeholders.push('(?, ?, ?, TRUE)');
        values.push(j, `SLOT-${String(j).padStart(5, '0')}`, election_id);
      }
      await conn.execute(
        `INSERT INTO seats (seat_number, seat_code, election_id, is_available) VALUES ${placeholders.join(',')}`,
        values
      );
    }

    // 3. Issue tokens for all enrolled students
    for (const s of students) {
      for (let t = 1; t <= courses.length; t++) {
        const tokenCode = `A${s.student_id}-E${election_id}-T${t}`;
        await conn.execute(
          'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
          [s.student_id, election_id, t, tokenCode]
        );
      }
    }

    // Update election with the universal cap
    await conn.execute(
      'UPDATE elections SET universal_slot_cap=?, status="NOT_STARTED" WHERE election_id=?',
      [SLOT_CAP, election_id]
    );

    await conn.commit();
    res.json({ success: true, message: `Universal Slot Pool (${SLOT_CAP} slots) and tokens for ${students.length} students initialised successfully.` });
  } catch (err) {
    await conn.rollback();
    console.error('initElection error:', err);
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
    const { stop_reason_text } = req.body;
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

    await conn.execute("UPDATE elections SET status='STOPPED', window_end=NOW(), is_paused=FALSE, stop_reason_text=? WHERE election_id=?", [stop_reason_text || null, election_id]);
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

    // ── DEEP CASCADING DELETE ─────────────────────────────
    // 1. Assignment details & Final assignments
    await conn.execute('DELETE FROM assignment_details WHERE assignment_id IN (SELECT assignment_id FROM final_assignments WHERE election_id=?)', [election_id]);
    await conn.execute('DELETE FROM final_assignments WHERE election_id=?', [election_id]);
    
    // 2. Allocation Sessions & their dependencies
    await conn.execute('DELETE FROM allocation_session_tokens WHERE session_id IN (SELECT session_id FROM allocation_sessions WHERE election_id=?)', [election_id]);
    await conn.execute('DELETE FROM allocation_session_courses WHERE session_id IN (SELECT session_id FROM allocation_sessions WHERE election_id=?)', [election_id]);
    await conn.execute('DELETE FROM allocation_overrides WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM allocation_sessions WHERE election_id=?', [election_id]);
    
    // 3. Analytics, Steps & Versions
    await conn.execute('DELETE FROM allocation_rounds WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM allocation_steps WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM allocation_versions WHERE election_id=?', [election_id]);
    
    // 4. Communication & Results
    await conn.execute('DELETE FROM election_messages WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM election_participants WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM election_choice_results WHERE election_id=?', [election_id]);
    
    // 5. Core Election Assets
    await conn.execute('DELETE FROM room_tickets WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM seats WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM student_tokens WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM courses WHERE election_id=?', [election_id]);
    await conn.execute('DELETE FROM election_cav WHERE election_id=?', [election_id]);
    
    // 6. Detach Students (but don't delete them)
    await conn.execute('UPDATE students SET election_id=NULL WHERE election_id=?', [election_id]);
    
    // 7. Final: Delete the Election itself
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
      `SELECT e.election_id, e.election_name, e.semester_tag, e.status, e.invite_count, cav.election_code
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

// ── Q2: TOKEN BURST CONTROL (6 modes) ────────────────────────
const bustTokens = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { mode, student_id, course_id, token_number, token_id, reason_text } = req.body;

    await conn.beginTransaction();

    let query = "UPDATE student_tokens SET is_busted=TRUE WHERE election_id=? AND is_busted=FALSE";
    const params = [election_id];

    if (mode === 1) { // 1. All seats of a Subject
      query += " AND course_id=?"; params.push(course_id);
    } else if (mode === 2) { // 2. All tokens of a Type
      query += " AND token_number=?"; params.push(token_number);
    } else if (mode === 3) { // 3. Type ∩ Subject
      query += " AND token_number=? AND course_id=?"; params.push(token_number, course_id);
    } else if (mode === 4) { // 4. Participant ∩ All their Tokens
      query += " AND student_id=?"; params.push(student_id);
    } else if (mode === 5) { // 5. Participant ∩ Subject
      query += " AND student_id=? AND course_id=?"; params.push(student_id, course_id);
    } else if (mode === 6) { // 6. Single Specific Token
      query += " AND token_id=?"; params.push(token_id);
    } else {
      throw new Error('Invalid burst mode.');
    }

    const [result]: any = await conn.execute(query, params);
    const bustedCount = result.affectedRows;

    // Log the burst for audit
    await conn.execute(
      `INSERT INTO token_busts (election_id, bust_mode, target_student_id, target_course_id, target_token_number, target_token_id, reason_text, tokens_busted)
       VALUES (?,?,?,?,?,?,?,?)`,
      [election_id, mode, student_id || null, course_id || null, token_number || null, token_id || null, reason_text || null, bustedCount]
    );

    await conn.commit();
    res.json({ success: true, message: `Burst successful. ${bustedCount} token(s) invalidated.`, tokens_busted: bustedCount });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally { conn.release(); }
};

const getBustHistory = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT tb.*, s.name as student_name, c.course_name
       FROM token_busts tb
       LEFT JOIN students s ON tb.target_student_id = s.student_id
       LEFT JOIN courses c ON tb.target_course_id = c.course_id
       WHERE tb.election_id=? ORDER BY tb.created_at DESC`,
      [election_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ── UNIFIED REASONS REPOSITORY ───────────────────────────────
const getReasons = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const [rows] = await pool.execute(
      'SELECT * FROM reasons_repository WHERE admin_id=? ORDER BY reason_type ASC, is_default DESC, name ASC',
      [admin_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const addReason = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { name, reason_type, related_domain, description, is_default } = req.body;
    await pool.execute(
      'INSERT INTO reasons_repository (admin_id, name, reason_type, related_domain, description, is_default) VALUES (?,?,?,?,?,?)',
      [admin_id, name, reason_type || 'GENERAL', related_domain || null, description || null, is_default || false]
    );
    res.json({ success: true, message: 'Reason added.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteReason = async (req, res) => {
  try {
    const admin_id = req.user.id;
    await pool.execute('DELETE FROM reasons_repository WHERE reason_id=? AND admin_id=?', [req.params.reason_id, admin_id]);
    res.json({ success: true, message: 'Reason deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const setDefaultReason = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { reason_id } = req.params;
    // First, find the reason_type of the given reason
    const [reasons] = await pool.execute('SELECT reason_type FROM reasons_repository WHERE reason_id=? AND admin_id=?', [reason_id, admin_id]);
    if (!reasons.length) return res.status(404).json({ success: false, message: 'Reason not found.' });
    
    const type = reasons[0].reason_type;
    
    await pool.execute('UPDATE reasons_repository SET is_default=FALSE WHERE reason_type=? AND admin_id=?', [type, admin_id]);
    await pool.execute('UPDATE reasons_repository SET is_default=TRUE WHERE reason_id=? AND admin_id=?', [reason_id, admin_id]);
    res.json({ success: true, message: 'Default set.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const issueTokenBatch = async (election_id: number, batchSize = 30) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Get active courses for the election
    const [courses] = await conn.execute('SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE', [election_id]);
    if (!courses.length) { await conn.rollback(); return; }
    const courseIds = courses.map((c: any) => c.course_id);
    // Select students without any tokens for this election (batch)
    const [students] = await conn.execute(
      `SELECT s.student_id FROM students s 
       LEFT JOIN student_tokens st ON s.student_id = st.student_id AND st.election_id = ?
       WHERE s.election_id = ? AND st.token_id IS NULL LIMIT ?`,
      [election_id, election_id, batchSize]
    );
    for (const s of students) {
      for (let i = 0; i < courseIds.length; i++) {
        const tokenCode = `A${s.student_id}-E${election_id}-T${i + 1}`;
        await conn.execute(
          'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
          [s.student_id, election_id, i + 1, tokenCode]
        );
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('issueTokenBatch error:', err);
  } finally {
    conn.release();
  }
};

const triggerInjection = async (req, res) => {
  try {
    const { election_id } = req.params;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [students] = await conn.execute(
        `SELECT student_id FROM students WHERE election_id = ? AND is_approved = TRUE`, [election_id]
      );
      const [courses] = await conn.execute(
        `SELECT course_id FROM courses WHERE election_id = ? AND is_active = TRUE`, [election_id]
      );
      
      let totalBooked = 0;
      
      // Instantly inject 756 tokens (126 students * 6 tokens)
      for (const s of students) {
        const [tokens] = await conn.execute(
          "SELECT token_id FROM student_tokens WHERE student_id = ? AND status = 'UNUSED' LIMIT 6",
          [s.student_id]
        );
        
        for (let i = 0; i < tokens.length; i++) {
          const c = courses[i % courses.length];
          const [seats] = await conn.execute('SELECT seat_id FROM seats WHERE election_id=? AND is_available=TRUE LIMIT 1', [election_id]);
          if (seats.length > 0) {
            await conn.execute('UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?', [c.course_id, tokens[i].token_id, seats[0].seat_id]);
            await conn.execute("UPDATE student_tokens SET status='STUDENT', course_id=?, seat_id=? WHERE token_id=?", [c.course_id, seats[0].seat_id, tokens[i].token_id]);
            totalBooked++;
          }
        }
      }
      
      await conn.commit();
      res.json({ success: true, message: `Successfully injected ${totalBooked} bookings!` });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, message: 'Injection failed: ' + err.message });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export {
  createElection, copyElection, updateElection, getElections, getElectionStatus, getChecklist, 
  initElection, startElection, pauseElection, resumeElection, stopElection, deleteElection,
  searchElections, getAdminProfile,
  scheduleElection, getInvitees, saveInvitees,
  uploadInstitutionCSV, saveInviteFieldConfig, getPoolCalculation,
  bustTokens, getBustHistory,
  getReasons, addReason, deleteReason, setDefaultReason,
  issueTokenBatch, triggerInjection
};

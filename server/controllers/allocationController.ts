import pool from '../config/db';
import { sendAllocationResult } from '../config/email';
import { runPromotion } from './allocationEngine';

// ── GET ROUND POOL ────────────────────────────────────────────
// Shows current allocation state for the Live Round dashboard
const getRoundPool = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    const election = elections[0];

    const [pool_data] = await pool.execute(
      `SELECT
         c.course_id, c.course_name, c.subject_code,
         c.min_enrollment, c.max_enrollment, c.is_burst,
         COUNT(st.token_id) as total_tokens,
         SUM(CASE WHEN st.token_number=1 THEN 1 ELSE 0 END) as t1_count,
         SUM(CASE WHEN st.token_number=2 THEN 1 ELSE 0 END) as t2_count,
         SUM(CASE WHEN st.token_number=3 THEN 1 ELSE 0 END) as t3_count,
         SUM(CASE WHEN st.token_number=4 THEN 1 ELSE 0 END) as t4_count,
         SUM(CASE WHEN st.token_number=5 THEN 1 ELSE 0 END) as t5_count
       FROM courses c
       LEFT JOIN student_tokens st ON (st.course_id=c.course_id AND st.election_id=? AND st.status IN ('BOOKED','CONFIRMED','AUTO'))
       WHERE c.election_id=?
       GROUP BY c.course_id
       ORDER BY total_tokens DESC`,
      [election_id, election_id]
    );

    const [stats] = await pool.execute(
      `SELECT
         COUNT(DISTINCT student_id) as total_students,
         SUM(CASE WHEN status IN ('CONFIRMED','AUTO') THEN 1 ELSE 0 END) as confirmed,
         SUM(CASE WHEN status='BOOKED' THEN 1 ELSE 0 END) as booked,
         SUM(CASE WHEN status='BURST' THEN 1 ELSE 0 END) as burst
       FROM student_tokens WHERE election_id=?`,
      [election_id]
    );

    res.json({ success: true, election, pool: pool_data, stats: stats[0] });
  } catch (err) {
    console.error('getRoundPool error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ASSISTANT ANALYTICS (Cumulative Intent) ────────────────
const getAssistantAnalytics = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT c.course_id, c.course_name, c.subject_code,
              SUM(CASE WHEN ecr.token_number=1 THEN 1 ELSE 0 END) as t1_intent,
              SUM(CASE WHEN ecr.token_number=2 THEN 1 ELSE 0 END) as t2_intent,
              SUM(CASE WHEN ecr.token_number <= 2 THEN 1 ELSE 0 END) as cumulative_intent,
              (SELECT COUNT(*) FROM students WHERE election_id=?) as total_students
       FROM courses c
       LEFT JOIN election_choice_results ecr ON c.course_id=ecr.course_id AND c.election_id=ecr.election_id
       WHERE c.election_id=?
       GROUP BY c.course_id
       ORDER BY cumulative_intent DESC`,
      [election_id, election_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── CONFIRM COURSE ────────────────────────────────────────────
const confirmCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id, course_id, capacity, round_number = 1 } = req.body;
    await conn.beginTransaction();

    const [candidates] = await conn.execute(
      `SELECT st.token_id, st.student_id FROM student_tokens st
       JOIN seats se ON st.seat_id = se.seat_id
       WHERE st.course_id=? AND st.election_id=? AND st.status='BOOKED'
       ORDER BY se.seat_number ASC`,
      [course_id, election_id]
    );

    let confirmed = 0; let burst = 0;
    const cascadeStudents = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (i < capacity) {
        await conn.execute("UPDATE student_tokens SET status='CONFIRMED', round_confirmed=? WHERE token_id=?", [round_number, c.token_id]);
        confirmed++;
      } else {
        await conn.execute("UPDATE student_tokens SET status='BURST' WHERE token_id=?", [c.token_id]);
        burst++;
        cascadeStudents.push(c.student_id);
      }
    }

    await conn.execute('UPDATE courses SET confirmed_count=? WHERE course_id=?', [confirmed, course_id]);

    // Log Step
    const [courseInfo] = await conn.execute('SELECT course_name FROM courses WHERE course_id=?', [course_id]);
    const [snapshot] = await conn.execute(
      `SELECT c.course_id, c.course_name, COUNT(st.token_id) as allocated FROM courses c
       LEFT JOIN student_tokens st ON st.course_id=c.course_id AND st.status IN ('CONFIRMED','AUTO')
       WHERE c.election_id=? GROUP BY c.course_id`, [election_id]
    );
    const [stepRow] = await conn.execute('SELECT COALESCE(MAX(step_number),0)+1 as next FROM allocation_steps WHERE election_id=?', [election_id]);
    await conn.execute(
      'INSERT INTO allocation_steps (election_id, step_number, action_type, course_id, course_name, confirm_count, cascade_count, snapshot_json, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [election_id, stepRow[0].next, 'CONFIRM', course_id, courseInfo[0]?.course_name, confirmed, burst, JSON.stringify(snapshot), req.user.id]
    );

    if (cascadeStudents.length) await runPromotion(conn, election_id, cascadeStudents);
    await conn.commit();
    res.json({ success: true, confirmed, burst });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally { conn.release(); }
};

// ── BURST COURSE ──────────────────────────────────────────────
const burstCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id, course_id, reason } = req.body;
    await conn.beginTransaction();

    const [courses] = await conn.execute('SELECT course_name FROM courses WHERE course_id=?', [course_id]);
    await conn.execute('UPDATE courses SET is_burst=TRUE, is_active=FALSE WHERE course_id=?', [course_id]);
    await conn.execute('UPDATE seats SET is_available=TRUE, student_token_id=NULL WHERE course_id=?', [course_id]);

    const [burstTokens] = await conn.execute("SELECT student_id FROM student_tokens WHERE course_id=? AND status='BOOKED'", [course_id]);
    await conn.execute("UPDATE student_tokens SET status='BURST', seat_id=NULL WHERE course_id=? AND status='BOOKED'", [course_id]);

    const [stepRow] = await conn.execute('SELECT COALESCE(MAX(step_number),0)+1 as next FROM allocation_steps WHERE election_id=?', [election_id]);
    await conn.execute(
      'INSERT INTO allocation_steps (election_id, step_number, action_type, course_id, course_name, reason, cascade_count, snapshot_json, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [election_id, stepRow[0].next, 'BURST', course_id, courses[0].course_name, reason, burstTokens.length, '[]', req.user.id]
    );

    if (burstTokens.length) await runPromotion(conn, election_id, [...new Set(burstTokens.map(t=>t.student_id))]);
    await conn.commit();
    res.json({ success: true, burst_count: burstTokens.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally { conn.release(); }
};

// ── ADVANCED BURST ────────────────────────────────────────────
const advancedBurst = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id, mode, subject_id, token_number } = req.body;
    await conn.beginTransaction();
    let burstTokens = [];

    if (mode === 'A') {
      const [rows] = await conn.execute("SELECT student_id FROM student_tokens WHERE course_id=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [subject_id, election_id]);
      burstTokens = rows;
      await conn.execute("UPDATE student_tokens SET status='BURST', seat_id=NULL WHERE course_id=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [subject_id, election_id]);
    } else if (mode === 'B') {
      const [rows] = await conn.execute("SELECT student_id FROM student_tokens WHERE token_number=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [token_number, election_id]);
      burstTokens = rows;
      await conn.execute("UPDATE student_tokens SET status='BURST', seat_id=NULL WHERE token_number=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [token_number, election_id]);
    } else if (mode === 'C') {
      const [rows] = await conn.execute("SELECT student_id FROM student_tokens WHERE course_id=? AND token_number=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [subject_id, token_number, election_id]);
      burstTokens = rows;
      await conn.execute("UPDATE student_tokens SET status='BURST', seat_id=NULL WHERE course_id=? AND token_number=? AND election_id=? AND status IN ('BOOKED','CONFIRMED')", [subject_id, token_number, election_id]);
    }

    if (burstTokens.length) await runPromotion(conn, election_id, [...new Set(burstTokens.map(t=>t.student_id))]);
    await conn.commit();
    res.json({ success: true, count: burstTokens.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally { conn.release(); }
};

// ── VERIFY ────────────────────────────────────────────────────
const verifyAllocation = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elections] = await pool.execute('SELECT final_courses_per_student FROM elections WHERE election_id=?', [election_id]);
    const required = elections[0].final_courses_per_student;

    const [students] = await pool.execute(
      `SELECT s.student_id, COUNT(CASE WHEN st.status IN ('CONFIRMED','AUTO') THEN 1 END) as confirmed
       FROM students s LEFT JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       WHERE s.election_id=? GROUP BY s.student_id`, [election_id, election_id]
    );

    const flagged = students.filter(s => s.confirmed < required);
    res.json({ success: true, verified: flagged.length === 0, total_students: students.length, required_per_student: required, flagged_students: flagged });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── EXPORT CSV ────────────────────────────────────────────────
const exportCSV = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elections] = await pool.execute('SELECT final_courses_per_student FROM elections WHERE election_id=?', [election_id]);
    const [rows] = await pool.execute(
      `SELECT s.register_number, s.name, s.email, s.section, c.course_name, c.subject_code, se.seat_code, st.token_number, st.status, st.is_auto_assigned
       FROM students s JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       LEFT JOIN courses c ON st.course_id=c.course_id LEFT JOIN seats se ON st.seat_id=se.seat_id
       WHERE st.status IN ('CONFIRMED','AUTO') ORDER BY s.register_number ASC, st.token_number ASC`, [election_id]
    );

    const byStudent = {};
    for (const r of rows) {
      if (!byStudent[r.register_number]) byStudent[r.register_number] = { reg: r.register_number, name: r.name, email: r.email, sec: r.section, courses: [] };
      byStudent[r.register_number].courses.push(r);
    }

    const max = elections[0].final_courses_per_student;
    let csv = 'Reg No,Name,Email,Section';
    for (let i=1; i<=max; i++) csv += `,Course ${i},Code ${i},Seat ${i},Method ${i}`;
    csv += '\n';

    for (const s of Object.values(byStudent) as any[]) {
      let line = `${s.reg},"${s.name}",${s.email},${s.sec}`;
      for (let i=0; i<max; i++) {
        const c = s.courses[i];
        line += c ? `,"${c.course_name}",${c.subject_code},${c.seat_code},${c.is_auto_assigned?'AUTO':'FCFS'}` : ',,,,';
      }
      csv += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ucos_${election_id}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── EMAILS ────────────────────────────────────────────────────
const sendResultEmails = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT s.name, s.email, c.course_name, c.subject_code, se.seat_code FROM students s
       JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       JOIN courses c ON st.course_id=c.course_id JOIN seats se ON st.seat_id=se.seat_id
       WHERE st.status IN ('CONFIRMED','AUTO')`, [election_id]
    );

    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.email]) grouped[r.email] = { name: r.name, courses: [] };
      grouped[r.email].courses.push(r);
    }

    let sent = 0;
    for (const email of Object.keys(grouped)) {
      await sendAllocationResult(email, grouped[email].name, grouped[email].courses);
      sent++;
    }
    res.json({ success: true, message: `Sent ${sent} emails.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── MANUAL ARRANGE ────────────────────────────────────────────
const manualArrange = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { election_id } = req.params; const { order = 'name' } = req.body;
    await conn.beginTransaction();

    const [unused] = await conn.execute(
      `SELECT st.token_id, st.course_id FROM student_tokens st JOIN students s ON st.student_id=s.student_id
       WHERE st.election_id=? AND st.status='UNUSED' ORDER BY ${order==='name'?'s.name':'s.register_number'} ASC`, [election_id]
    );

    const [seats] = await conn.execute('SELECT seat_id FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number ASC LIMIT ?', [election_id, unused.length]);

    let assigned = 0;
    for (let i=0; i<Math.min(unused.length, seats.length); i++) {
      await conn.execute("UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?", [unused[i].course_id, unused[i].token_id, seats[i].seat_id]);
      await conn.execute("UPDATE student_tokens SET status='AUTO', seat_id=?, is_auto_assigned=TRUE WHERE token_id=?", [seats[i].seat_id, unused[i].token_id]);
      assigned++;
    }

    await conn.commit();
    res.json({ success: true, assigned });
  } catch (err) { await conn.rollback(); res.status(500).json({ success: false, message: 'Error.' }); }
  finally { conn.release(); }
};

// ── UNALLOCATED ───────────────────────────────────────────────
const getUnallocated = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.student_id, s.name, s.register_number, s.section, s.email, COUNT(st.token_id) as unused_count
       FROM student_tokens st JOIN students s ON st.student_id=s.student_id
       WHERE st.election_id=? AND st.status='UNUSED' GROUP BY s.student_id, s.name, s.register_number, s.section, s.email`, [req.params.election_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── STEPS ─────────────────────────────────────────────────────
const getSteps = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM allocation_steps WHERE election_id=? ORDER BY step_number ASC", [req.params.election_id]);
    res.json({ success: true, data: rows.map(r=>({...r, snapshot: r.snapshot_json?JSON.parse(r.snapshot_json):[]})) });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

// ── ABACUS ────────────────────────────────────────────────────
const getAbacusSummary = async (req, res) => {
  try {
    const { election_id } = req.params;
    const [elections] = await pool.execute('SELECT * FROM elections WHERE election_id=?', [election_id]);
    const [rows] = await pool.execute(
      `SELECT c.course_id, c.course_name, c.subject_code, c.is_burst, c.min_enrollment, c.max_enrollment,
              SUM(CASE WHEN st.token_number=1 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t1,
              SUM(CASE WHEN st.token_number=2 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t2,
              SUM(CASE WHEN st.token_number=3 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t3,
              SUM(CASE WHEN st.token_number=4 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t4,
              SUM(CASE WHEN st.token_number=5 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t5,
              SUM(CASE WHEN st.status='BURST' THEN 1 ELSE 0 END) as eliminated_count,
              SUM(CASE WHEN ecr.token_number=1 THEN 1 ELSE 0 END) as orig_t1,
              SUM(CASE WHEN ecr.token_number=2 THEN 1 ELSE 0 END) as orig_t2,
              SUM(CASE WHEN ecr.token_number=3 THEN 1 ELSE 0 END) as orig_t3,
              SUM(CASE WHEN ecr.token_number=4 THEN 1 ELSE 0 END) as orig_t4,
              SUM(CASE WHEN ecr.token_number=5 THEN 1 ELSE 0 END) as orig_t5
       FROM courses c
       LEFT JOIN student_tokens st ON c.course_id=st.course_id
       LEFT JOIN election_choice_results ecr ON c.course_id=ecr.course_id
       WHERE c.election_id=? GROUP BY c.course_id ORDER BY c.course_name ASC`, [election_id]
    );

    const totals = { orig_t1:0, orig_t2:0, alloc_t1:0, alloc_t2:0, eliminated_count:0 };
    for (const r of rows) { totals.orig_t1 += Number(r.orig_t1); totals.orig_t2 += Number(r.orig_t2); totals.alloc_t1 += Number(r.alloc_t1); totals.alloc_t2 += Number(r.alloc_t2); totals.eliminated_count += Number(r.eliminated_count); }

    res.json({ success: true, data: rows, totals, election: elections[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Error.' }); }
};

export { getRoundPool, getAssistantAnalytics, confirmCourse, burstCourse, advancedBurst, verifyAllocation, exportCSV, sendResultEmails, manualArrange, getUnallocated, getSteps, getAbacusSummary };

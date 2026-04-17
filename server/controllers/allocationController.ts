import pool from '../config/db';
import { sendAllocationResult  } from '../config/email';
import { runPromotion } from './allocationEngine';

// ── GET ROUND POOL ────────────────────────────────────────────
// Shows T1+T2 demand distribution for Round 1, or cascaded tokens for later rounds
const getRoundPool = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    // Verify admin owns this election
    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const election = elections[0];

    // Get distribution: count of BOOKED tokens per course (T1+T2 pool)
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
       LEFT JOIN student_tokens st ON (
         st.course_id=c.course_id AND
         st.election_id=? AND
         st.status IN ('BOOKED','AUTO')
       )
       WHERE c.election_id=?
       GROUP BY c.course_id
       ORDER BY total_tokens DESC`,
      [election_id, election_id]
    );

    // Total students needing allocation
    const [unconfirmed] = await pool.execute(
      `SELECT COUNT(DISTINCT s.student_id) as cnt
       FROM students s
       WHERE s.election_id=?
       AND (
         SELECT COUNT(*) FROM student_tokens st2
         WHERE st2.student_id=s.student_id
         AND st2.election_id=?
         AND st2.status IN ('CONFIRMED','AUTO')
       ) < ?`,
      [election_id, election_id, election.final_courses_per_student]
    );

    // Summary stats
    const [stats] = await pool.execute(
      `SELECT
         COUNT(DISTINCT student_id) as total_students,
         SUM(CASE WHEN status='CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
         SUM(CASE WHEN status='BOOKED' THEN 1 ELSE 0 END) as booked,
         SUM(CASE WHEN status='BURST' THEN 1 ELSE 0 END) as burst,
         SUM(CASE WHEN status='AUTO' THEN 1 ELSE 0 END) as auto_assigned,
         SUM(CASE WHEN status='UNUSED' THEN 1 ELSE 0 END) as unused
       FROM student_tokens WHERE election_id=?`,
      [election_id]
    );

    res.json({
      success: true,
      election,
      pool: pool_data,
      stats: stats[0],
      students_pending: unconfirmed[0].cnt,
    });
  } catch (err) {
    console.error('getRoundPool error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── CONFIRM COURSE at capacity N ──────────────────────────────
// Top-N by seat number -> CONFIRMED, rest -> BURST -> cascade
const confirmCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id, course_id, capacity, round_number = 1 } = req.body;

    if (!election_id || !course_id || capacity === undefined) {
      return res.status(400).json({ success: false, message: 'election_id, course_id, and capacity required.' });
    }

    // Verify admin
    const [elections] = await conn.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    await conn.beginTransaction();

    // Get all BOOKED tokens for this course, ordered by seat_number (FCFS)
    const [candidates] = await conn.execute(
      `SELECT st.token_id, st.student_id, st.token_number, se.seat_number
       FROM student_tokens st
       JOIN seats se ON st.seat_id = se.seat_id
       WHERE st.course_id=? AND st.election_id=? AND st.status='BOOKED'
       ORDER BY se.seat_number ASC`,
      [course_id, election_id]
    );

    let confirmed = 0;
    let burst = 0;
    const cascadeStudents = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (i < capacity) {
        // CONFIRM
        await conn.execute(
          'UPDATE student_tokens SET status=?, round_confirmed=? WHERE token_id=?',
          ['CONFIRMED', round_number, c.token_id]
        );
        confirmed++;
      } else {
        // BURST — find next booked token for this student
        await conn.execute(
          "UPDATE student_tokens SET status='BURST' WHERE token_id=?",
          [c.token_id]
        );
        burst++;
        cascadeStudents.push(c.student_id);
      }
    }

    // Update course confirmed count
    await conn.execute(
      'UPDATE courses SET confirmed_count=? WHERE course_id=?',
      [confirmed, course_id]
    );

    // Record round (non-critical logging — don't fail booking on log error)
    try {
      await conn.execute(
        `INSERT INTO allocation_rounds (election_id, round_number, students_confirmed, capacity_settings)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (election_id, round_number) DO UPDATE SET students_confirmed = allocation_rounds.students_confirmed + EXCLUDED.students_confirmed`,
        [election_id, round_number, confirmed, JSON.stringify({ course_id, capacity })]
      );
    } catch (e) { console.warn('round log:', e.message); }

    // Log allocation step for alter-table history
    try {
      const [courseInfo] = await conn.execute('SELECT course_name FROM courses WHERE course_id=?', [course_id]);
      const [snapshot] = await conn.execute(
        `SELECT c.course_id, c.course_name, c.subject_code, c.is_burst, c.min_enrollment, c.max_enrollment,
                SUM(CASE WHEN st.token_number=1 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as t1,
                SUM(CASE WHEN st.token_number=2 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as t2,
                SUM(CASE WHEN st.token_number=3 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as t3,
                SUM(CASE WHEN st.token_number=4 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as t4,
                SUM(CASE WHEN st.token_number=5 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as t5,
                COUNT(DISTINCT CASE WHEN st.status='CONFIRMED' THEN st.student_id END) as allocated,
                COUNT(DISTINCT CASE WHEN st.status='BURST' THEN st.student_id END) as burst_total
         FROM courses c
         LEFT JOIN student_tokens st ON st.course_id=c.course_id AND st.election_id=c.election_id
         WHERE c.election_id=?
         GROUP BY c.course_id`,
        [election_id]
      );
      const [stepRow] = await conn.execute(
        'SELECT COALESCE(MAX(step_number),0)+1 as next_step FROM allocation_steps WHERE election_id=?',
        [election_id]
      );
      await conn.execute(
        `INSERT INTO allocation_steps (election_id, step_number, action_type, course_id, course_name, confirm_count, cascade_count, snapshot_json, created_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [election_id, stepRow[0].next_step, 'CONFIRM', course_id, courseInfo[0]?.course_name || '', confirmed, burst, JSON.stringify(snapshot), admin_id]
      );
    } catch (e) { console.warn('step log:', e.message); }

    // RUN PROMOTION ENGINE for cascaded students
    if (cascadeStudents.length) {
      await runPromotion(conn, election_id, cascadeStudents);
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Course confirmed: ${confirmed} students confirmed, ${burst} cascaded.`,
      confirmed,
      burst,
      cascade_count: cascadeStudents.length,
    });
  } catch (err) {
    await conn.rollback();
    console.error('confirmCourse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── BURST COURSE ──────────────────────────────────────────────
// Deactivates all seats for course, marks all BOOKED tokens as BURST
const burstCourse = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id, course_id, round_number = 1, reason } = req.body;

    const [elections] = await conn.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    // Get course info before bursting
    const [courses] = await conn.execute(
      'SELECT course_name, subject_code FROM courses WHERE course_id=? AND election_id=?',
      [course_id, election_id]
    );
    if (!courses.length) return res.status(404).json({ success: false, message: 'Course not found.' });
    const courseName = courses[0].course_name;

    await conn.beginTransaction();

    // Mark course as burst
    await conn.execute(
      'UPDATE courses SET is_burst=TRUE, is_active=FALSE WHERE course_id=? AND election_id=?',
      [course_id, election_id]
    );

    // Free all seats for this course
    await conn.execute(
      'UPDATE seats SET is_available=TRUE, student_token_id=NULL WHERE course_id=? AND election_id=?',
      [course_id, election_id]
    );

    // Mark all BOOKED tokens for this course as BURST
    const [burstTokens] = await conn.execute(
      "SELECT token_id, student_id, token_number FROM student_tokens WHERE course_id=? AND election_id=? AND status='BOOKED'",
      [course_id, election_id]
    );

    await conn.execute(
      "UPDATE student_tokens SET status='BURST', seat_id=NULL, timestamp_booked=NULL WHERE course_id=? AND election_id=? AND status='BOOKED'",
      [course_id, election_id]
    );

    // Build snapshot of current token distribution for all courses
    const [snapshot] = await conn.execute(
      `SELECT c.course_id, c.course_name, c.subject_code, c.is_burst, c.min_enrollment, c.max_enrollment,
              SUM(CASE WHEN st.token_number=1 AND st.status IN ('BOOKED','CONFIRMED','BURST') THEN 1 ELSE 0 END) as t1,
              SUM(CASE WHEN st.token_number=2 AND st.status IN ('BOOKED','CONFIRMED','BURST') THEN 1 ELSE 0 END) as t2,
              SUM(CASE WHEN st.token_number=3 AND st.status IN ('BOOKED','CONFIRMED','BURST') THEN 1 ELSE 0 END) as t3,
              SUM(CASE WHEN st.token_number=4 AND st.status IN ('BOOKED','CONFIRMED','BURST') THEN 1 ELSE 0 END) as t4,
              SUM(CASE WHEN st.token_number=5 AND st.status IN ('BOOKED','CONFIRMED','BURST') THEN 1 ELSE 0 END) as t5,
              COUNT(DISTINCT CASE WHEN st.status IN ('BOOKED','CONFIRMED') THEN st.student_id END) as allocated,
              COUNT(DISTINCT CASE WHEN st.status='BURST' THEN st.student_id END) as burst_total
       FROM courses c
       LEFT JOIN student_tokens st ON st.course_id=c.course_id AND st.election_id=c.election_id
       WHERE c.election_id=?
       GROUP BY c.course_id`,
      [election_id]
    );

    // Get next step number
    const [stepRow] = await conn.execute(
      'SELECT COALESCE(MAX(step_number),0)+1 as next_step FROM allocation_steps WHERE election_id=?',
      [election_id]
    );
    const stepNum = stepRow[0].next_step;

    // Log step
    await conn.execute(
      `INSERT INTO allocation_steps (election_id, step_number, action_type, course_id, course_name, reason, cascade_count, snapshot_json, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [election_id, stepNum, 'BURST', course_id, courseName, reason || `Eliminated due to insufficient enrolment.`, burstTokens.length, JSON.stringify(snapshot), admin_id]
    );

    // Log round (non-critical)
    try {
      await conn.execute(
        `INSERT INTO allocation_rounds (election_id, round_number, students_confirmed)
         VALUES (?, ?, 0)
         ON CONFLICT (election_id, round_number) DO UPDATE SET students_confirmed = allocation_rounds.students_confirmed`,
        [election_id, round_number]
      );
    } catch (e) { console.warn('burst round log:', e.message); }

    // RUN PROMOTION ENGINE for all burst students
    if (burstTokens.length) {
      const studentIds = [...new Set(burstTokens.map(t => t.student_id))];
      await runPromotion(conn, election_id, studentIds);
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Course burst. ${burstTokens.length} students cascaded to next tokens.`,
      burst_count: burstTokens.length,
      step_number: stepNum,
      course_name: courseName,
      reason: reason || `Eliminated due to insufficient enrolment.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('burstCourse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── FINAL VERIFICATION ────────────────────────────────────────
const verifyAllocation = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const required = elections[0].final_courses_per_student;

    // Check every student has exactly `required` confirmed tokens
    const [students] = await pool.execute(
      `SELECT s.student_id, s.name, s.register_number,
              COUNT(CASE WHEN st.status IN ('CONFIRMED','AUTO') THEN 1 END) as confirmed
       FROM students s
       LEFT JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       WHERE s.election_id=?
       GROUP BY s.student_id`,
      [election_id, election_id]
    );

    const ok = students.every(s => s.confirmed >= required);
    const flagged = students.filter(s => s.confirmed < required);
    const total = students.reduce((sum, s) => sum + Number(s.confirmed), 0);

    res.json({
      success: true,
      verified: ok,
      total_students: students.length,
      required_per_student: required,
      total_confirmed: total,
      expected_total: students.length * required,
      flagged_students: flagged,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── EXPORT CSV ────────────────────────────────────────────────
const exportCSV = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [rows] = await pool.execute(
      `SELECT s.register_number, s.full_student_id, s.name, s.email, s.section,
              st.token_code, st.token_number, st.status, st.round_confirmed,
              st.is_auto_assigned, st.timestamp_booked,
              c.course_name, c.subject_code,
              se.seat_code
       FROM students s
       JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       LEFT JOIN courses c ON st.course_id=c.course_id
       LEFT JOIN seats se ON st.seat_id=se.seat_id
       WHERE s.election_id=? AND st.status IN ('CONFIRMED','AUTO')
       ORDER BY s.register_number ASC, st.token_number ASC`,
      [election_id, election_id]
    );

    // Group by student, pivot courses
    const byStudent = {};
    for (const row of rows) {
      if (!byStudent[row.register_number]) {
        byStudent[row.register_number] = {
          register_number: row.register_number,
          full_student_id: row.full_student_id,
          name: row.name,
          email: row.email,
          section: row.section,
          courses: [],
        };
      }
      byStudent[row.register_number].courses.push({
        course_name: row.course_name,
        subject_code: row.subject_code,
        seat_code: row.seat_code,
        token_code: row.token_code,
        round: row.round_confirmed || 'AUTO',
        method: row.is_auto_assigned ? 'AUTO' : 'FCFS',
      });
    }

    // Build CSV
    const maxCourses = elections[0].final_courses_per_student;
    let csv = 'Register No,Student ID,Name,Email,Section';
    for (let i = 1; i <= maxCourses; i++) {
      csv += `,Course ${i},Code ${i},Seat ${i},Token ${i},Round ${i},Method ${i}`;
    }
    csv += '\n';

    for (const s of Object.values(byStudent)) {
      let row = `${s.register_number},${s.full_student_id},"${s.name}",${s.email},${s.section}`;
      for (let i = 0; i < maxCourses; i++) {
        const c = s.courses[i];
        if (c) {
          row += `,"${c.course_name}",${c.subject_code || ''},${c.seat_code},${c.token_code},${c.round},${c.method}`;
        } else {
          row += ',,,,,';
        }
      }
      csv += row + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ucos_allocation_${election_id}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('exportCSV error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── SEND RESULT EMAILS ────────────────────────────────────────
const sendResultEmails = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT s.name, s.email,
              json_agg(json_build_object(
                'course_name', c.course_name,
                'subject_code', c.subject_code,
                'seat_code', se.seat_code,
                'token_code', st.token_code
              )) as courses
       FROM students s
       JOIN student_tokens st ON s.student_id=st.student_id AND st.election_id=?
       JOIN courses c ON st.course_id=c.course_id
       JOIN seats se ON st.seat_id=se.seat_id
       WHERE s.election_id=? AND st.status IN ('CONFIRMED','AUTO')
       GROUP BY s.student_id`,
      [election_id, election_id]
    );

    let sent = 0;
    for (const row of rows) {
      try {
        const courses = typeof row.courses === 'string' ? JSON.parse(row.courses) : row.courses;
        await sendAllocationResult(row.email, row.name, courses);
        sent++;
      } catch (e) {
        console.warn(`Email failed for ${row.email}:`, e.message);
      }
    }

    res.json({ success: true, message: `Emails sent to ${sent} of ${rows.length} students.`, sent });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── ADMIN: Manual seat arrangement for unallocated students ──
const manualArrange = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    // order: 'priority' | 'name' — how to assign remaining seats
    const { order = 'name', course_id } = req.body;

    const [elections] = await conn.execute(
      "SELECT * FROM elections WHERE election_id=? AND admin_id=? AND status='STOPPED'",
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Stopped election not found.' });

    await conn.beginTransaction();

    // Get students with unused tokens for this course (or all courses)
    const courseFilter = course_id ? 'AND st.course_id=?' : '';
    const courseParams = course_id ? [election_id, course_id] : [election_id];

    const [unassigned] = await conn.execute(
      `SELECT st.token_id, st.student_id, st.course_id, s.name, s.register_number, s.section
       FROM student_tokens st
       JOIN students s ON st.student_id = s.student_id
       WHERE st.election_id=? AND st.status='UNUSED' ${courseFilter}
       ORDER BY ${order === 'name' ? 's.name ASC' : 's.register_number ASC'}`,
      courseParams
    );

    if (!unassigned.length) {
      await conn.rollback();
      return res.json({ success: true, message: 'No unassigned tokens found.', assigned: 0 });
    }

    // Get available seats
    const [seats] = await conn.execute(
      `SELECT seat_id FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number ASC LIMIT ?`,
      [election_id, unassigned.length]
    );

    let assigned = 0;
    for (let i = 0; i < Math.min(unassigned.length, seats.length); i++) {
      const token = unassigned[i];
      const seat = seats[i];
      await conn.execute(
        "UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?",
        [token.course_id, token.token_id, seat.seat_id]
      );
      await conn.execute(
        "UPDATE student_tokens SET status='AUTO', seat_id=?, timestamp_booked=NOW(), is_auto_assigned=TRUE WHERE token_id=?",
        [seat.seat_id, token.token_id]
      );
      assigned++;
    }

    await conn.commit();
    res.json({ success: true, message: `Manually arranged ${assigned} seats by ${order}.`, assigned });
  } catch (err) {
    await conn.rollback();
    console.error('manualArrange error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── ADMIN: Get unallocated students list ───────────────────────
const getUnallocated = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      "SELECT election_id FROM elections WHERE election_id=? AND admin_id=? AND status='STOPPED'",
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [rows] = await pool.execute(
      `SELECT s.student_id, s.name, s.register_number, s.section, s.email,
              COUNT(st.token_id) as unused_count,
              string_agg(c.course_name, ', ') as pending_courses
       FROM student_tokens st
       JOIN students s ON st.student_id = s.student_id
       LEFT JOIN courses c ON st.course_id = c.course_id
       WHERE st.election_id=? AND st.status='UNUSED'
       GROUP BY s.student_id, s.name, s.register_number, s.section, s.email
       ORDER BY s.name ASC`,
      [election_id]
    );

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('getUnallocated error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// end of allocationController

// ── GET ALLOCATION STEPS (alter-table history) ─────────────────
const getSteps = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT election_id FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [steps] = await pool.execute(
      `SELECT step_id, step_number, action_type, course_id, course_name, reason,
              cascade_count, confirm_count, snapshot_json, created_at
       FROM allocation_steps
       WHERE election_id=?
       ORDER BY step_number ASC`,
      [election_id]
    );

    // Parse JSON snapshots
    const parsed = steps.map(s => ({
      ...s,
      snapshot: s.snapshot_json ? JSON.parse(s.snapshot_json) : [],
      snapshot_json: undefined,
    }));

    res.json({ success: true, data: parsed, total: parsed.length });
  } catch (err) {
    console.error('getSteps error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ABACUS SUMMARY (live token distribution table) ─────────
const getAbacusSummary = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [rows] = await pool.execute(
      `SELECT c.course_id, c.course_name, c.subject_code, c.is_burst, c.is_active,
              c.min_enrollment, c.max_enrollment, c.confirmed_count,
              -- Original (from choice results snapshot)
              SUM(CASE WHEN ecr.token_number=1 THEN 1 ELSE 0 END) as orig_t1,
              SUM(CASE WHEN ecr.token_number=2 THEN 1 ELSE 0 END) as orig_t2,
              SUM(CASE WHEN ecr.token_number=3 THEN 1 ELSE 0 END) as orig_t3,
              SUM(CASE WHEN ecr.token_number=4 THEN 1 ELSE 0 END) as orig_t4,
              SUM(CASE WHEN ecr.token_number=5 THEN 1 ELSE 0 END) as orig_t5,
              SUM(CASE WHEN ecr.is_auto_assigned=FALSE AND ecr.original_status IN ('CONFIRMED','BOOKED') THEN 1 ELSE 0 END) as orig_self,
              SUM(CASE WHEN ecr.is_auto_assigned=TRUE THEN 1 ELSE 0 END) as orig_auto,
              COUNT(ecr.result_id) as orig_total,
              -- Allocated (current live state from student_tokens)
              SUM(CASE WHEN st.token_number=1 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t1,
              SUM(CASE WHEN st.token_number=2 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t2,
              SUM(CASE WHEN st.token_number=3 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t3,
              SUM(CASE WHEN st.token_number=4 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t4,
              SUM(CASE WHEN st.token_number=5 AND st.status IN ('BOOKED','CONFIRMED') THEN 1 ELSE 0 END) as alloc_t5,
              SUM(CASE WHEN st.status='BURST' THEN 1 ELSE 0 END) as eliminated_count,
              SUM(CASE WHEN st.status IN ('BOOKED','CONFIRMED') AND st.is_auto_assigned=FALSE THEN 1 ELSE 0 END) as alloc_self,
              SUM(CASE WHEN st.status IN ('BOOKED','CONFIRMED') AND st.is_auto_assigned=TRUE THEN 1 ELSE 0 END) as alloc_auto
       FROM courses c
       LEFT JOIN election_choice_results ecr ON ecr.course_id=c.course_id AND ecr.election_id=c.election_id
       LEFT JOIN student_tokens st ON st.course_id=c.course_id AND st.election_id=c.election_id
       WHERE c.election_id=?
       GROUP BY c.course_id
       ORDER BY c.is_burst ASC, c.course_name ASC`,
      [election_id]
    );

    // Totals row
    const totals = {
      orig_t1: 0, orig_t2: 0, orig_t3: 0, orig_t4: 0, orig_t5: 0, orig_total: 0, orig_self: 0, orig_auto: 0,
      alloc_t1: 0, alloc_t2: 0, alloc_t3: 0, alloc_t4: 0, alloc_t5: 0, alloc_self: 0, alloc_auto: 0, eliminated_count: 0,
    };
    for (const r of rows) {
      for (const k of Object.keys(totals)) {
        totals[k] += Number(r[k] || 0);
      }
    }

    res.json({ success: true, data: rows, totals, total_courses: rows.length });
  } catch (err) {
    console.error('getAbacusSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { getRoundPool, confirmCourse, burstCourse, verifyAllocation, exportCSV, sendResultEmails, manualArrange, getUnallocated, getSteps, getAbacusSummary  };

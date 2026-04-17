const pool = require('../config/db');

// ── LOCK CHOICE RESULTS (called automatically on election stop) ─
// Snapshots all student_tokens into election_choice_results.
// This is the immutable "what students chose" record.
const lockChoiceResults = async (election_id, conn) => {
  const db = conn || pool;
  // Idempotent — skip if already locked
  const [existing] = await db.execute(
    'SELECT COUNT(*) as cnt FROM election_choice_results WHERE election_id=?',
    [election_id]
  );
  if (existing[0].cnt > 0) return existing[0].cnt;

  const [tokens] = await db.execute(
    `SELECT student_id, token_number, course_id, status, is_auto_assigned,
            seat_id, round_confirmed, token_code
     FROM student_tokens
     WHERE election_id=? AND course_id IS NOT NULL`,
    [election_id]
  );

  if (!tokens.length) return 0;

  // Bulk insert
  const values = tokens.map(t =>
    `(${election_id}, ${t.student_id}, ${t.token_number}, ${t.course_id},
      '${t.status}', ${t.is_auto_assigned ? 1 : 0},
      ${t.seat_id || 'NULL'}, ${t.round_confirmed || 'NULL'},
      '${t.token_code.replace(/'/g, "''")}')`
  ).join(',');

  await db.execute(
    `INSERT IGNORE INTO election_choice_results
     (election_id, student_id, token_number, course_id, original_status,
      is_auto_assigned, seat_id, round_confirmed, token_code)
     VALUES ${values}`
  );

  return tokens.length;
};

// ── GET CHOICE RESULTS (the immutable snapshot) ───────────────
const getChoiceResults = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    // Check if locked
    const [countRow] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM election_choice_results WHERE election_id=?',
      [election_id]
    );
    const isLocked = countRow[0].cnt > 0;

    if (!isLocked) {
      return res.json({ success: true, locked: false, data: [], message: 'Results not yet locked.' });
    }

    // Summary: per course, per token tier
    const [summary] = await pool.execute(
      `SELECT
         c.course_id, c.course_name, c.subject_code,
         c.min_enrollment, c.max_enrollment, c.is_burst,
         COUNT(ecr.result_id) as total,
         SUM(CASE WHEN ecr.token_number=1 THEN 1 ELSE 0 END) as t1,
         SUM(CASE WHEN ecr.token_number=2 THEN 1 ELSE 0 END) as t2,
         SUM(CASE WHEN ecr.token_number=3 THEN 1 ELSE 0 END) as t3,
         SUM(CASE WHEN ecr.token_number=4 THEN 1 ELSE 0 END) as t4,
         SUM(CASE WHEN ecr.token_number=5 THEN 1 ELSE 0 END) as t5,
         SUM(CASE WHEN ecr.is_auto_assigned=1 THEN 1 ELSE 0 END) as auto_count,
         SUM(CASE WHEN ecr.is_auto_assigned=0 AND ecr.original_status IN ('CONFIRMED','BOOKED') THEN 1 ELSE 0 END) as self_count
       FROM courses c
       LEFT JOIN election_choice_results ecr ON ecr.course_id=c.course_id AND ecr.election_id=?
       WHERE c.election_id=?
       GROUP BY c.course_id
       ORDER BY total DESC`,
      [election_id, election_id]
    );

    // Per-student detail
    const [rows] = await pool.execute(
      `SELECT ecr.*, s.name, s.register_number, s.section, s.full_student_id,
              c.course_name, c.subject_code
       FROM election_choice_results ecr
       JOIN students s ON ecr.student_id = s.student_id
       JOIN courses c ON ecr.course_id = c.course_id
       WHERE ecr.election_id=?
       ORDER BY s.register_number ASC, ecr.token_number ASC`,
      [election_id]
    );

    res.json({
      success: true,
      locked: true,
      locked_at: rows[0]?.locked_at || null,
      election: elections[0],
      summary,
      rows,
      total_students: [...new Set(rows.map(r => r.student_id))].length,
      total_records: rows.length,
    });
  } catch (err) {
    console.error('getChoiceResults error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET ALLOCATION SESSIONS for election ──────────────────────
const getSessions = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [sessions] = await pool.execute(
      `SELECT s.*,
         (SELECT COUNT(*) FROM allocation_overrides ao WHERE ao.session_id=s.session_id) as override_count
       FROM allocation_sessions s
       WHERE s.election_id=?
       ORDER BY s.is_final DESC, s.created_at DESC`,
      [election_id]
    );

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── CREATE ALLOCATION SESSION ─────────────────────────────────
const createSession = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { session_name, notes } = req.body;

    if (!session_name?.trim()) {
      return res.status(400).json({ success: false, message: 'session_name required.' });
    }

    const [elections] = await pool.execute(
      'SELECT * FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [result] = await pool.execute(
      'INSERT INTO allocation_sessions (election_id, session_name, notes) VALUES (?,?,?)',
      [election_id, session_name.trim(), notes || null]
    );

    res.json({
      success: true,
      message: 'Session created.',
      session_id: result.insertId,
    });
  } catch (err) {
    console.error('createSession error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── MARK SESSION AS FINAL ─────────────────────────────────────
const finalizeSession = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { session_id } = req.params;

    await conn.beginTransaction();

    // Verify ownership
    const [sessions] = await conn.execute(
      `SELECT s.*, e.admin_id FROM allocation_sessions s
       JOIN elections e ON s.election_id=e.election_id
       WHERE s.session_id=? AND e.admin_id=?`,
      [session_id, admin_id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'Session not found.' });

    const { election_id } = sessions[0];

    // Un-final all others for this election
    await conn.execute(
      'UPDATE allocation_sessions SET is_final=FALSE WHERE election_id=?',
      [election_id]
    );

    // Final this one
    await conn.execute(
      'UPDATE allocation_sessions SET is_final=TRUE, finalized_at=NOW() WHERE session_id=?',
      [session_id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Session marked as final.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── GET SESSION DETAIL (choice results + overrides applied) ───
const getSessionDetail = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { session_id } = req.params;

    const [sessions] = await pool.execute(
      `SELECT s.*, e.admin_id, e.election_name, e.final_courses_per_student
       FROM allocation_sessions s
       JOIN elections e ON s.election_id=e.election_id
       WHERE s.session_id=? AND e.admin_id=?`,
      [session_id, admin_id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'Session not found.' });

    const session = sessions[0];
    const { election_id } = session;

    // Get overrides for this session
    const [overrides] = await pool.execute(
      'SELECT * FROM allocation_overrides WHERE session_id=?',
      [session_id]
    );
    const overrideMap = {};
    for (const o of overrides) {
      overrideMap[`${o.student_id}_${o.token_number}`] = o;
    }

    // Base: choice results
    const [baseRows] = await pool.execute(
      `SELECT ecr.*, s.name, s.register_number, s.section, s.full_student_id,
              c.course_name, c.subject_code
       FROM election_choice_results ecr
       JOIN students s ON ecr.student_id=s.student_id
       JOIN courses c ON ecr.course_id=c.course_id
       WHERE ecr.election_id=?
       ORDER BY s.register_number ASC, ecr.token_number ASC`,
      [election_id]
    );

    // Apply overrides
    const rows = await Promise.all(baseRows.map(async row => {
      const key = `${row.student_id}_${row.token_number}`;
      if (overrideMap[key]) {
        const ov = overrideMap[key];
        // Fetch overridden course name
        const [courses] = await pool.execute(
          'SELECT course_name, subject_code FROM courses WHERE course_id=?',
          [ov.course_id]
        );
        return {
          ...row,
          course_id: ov.course_id,
          course_name: courses[0]?.course_name || row.course_name,
          subject_code: courses[0]?.subject_code || row.subject_code,
          is_overridden: true,
          override_reason: ov.reason,
          original_course_id: row.course_id,
          original_course_name: row.course_name,
        };
      }
      return { ...row, is_overridden: false };
    }));

    // Rebuild summary from (possibly overridden) rows
    const courseMap = {};
    for (const row of rows) {
      if (!courseMap[row.course_id]) {
        courseMap[row.course_id] = {
          course_id: row.course_id,
          course_name: row.course_name,
          subject_code: row.subject_code,
          t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, total: 0,
          auto_count: 0, self_count: 0, overridden_count: 0,
        };
      }
      const c = courseMap[row.course_id];
      c[`t${row.token_number}`]++;
      c.total++;
      if (row.is_auto_assigned) c.auto_count++;
      else c.self_count++;
      if (row.is_overridden) c.overridden_count++;
    }

    res.json({
      success: true,
      session,
      rows,
      summary: Object.values(courseMap),
      overrides: overrides.length,
    });
  } catch (err) {
    console.error('getSessionDetail error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── SAVE OVERRIDE in a session ─────────────────────────────────
const saveOverride = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { session_id } = req.params;
    const { student_id, token_number, course_id, reason } = req.body;

    if (!student_id || !token_number || !course_id) {
      return res.status(400).json({ success: false, message: 'student_id, token_number, course_id required.' });
    }

    // Verify ownership
    const [sessions] = await pool.execute(
      `SELECT s.*, e.admin_id, s.election_id FROM allocation_sessions s
       JOIN elections e ON s.election_id=e.election_id
       WHERE s.session_id=? AND e.admin_id=?`,
      [session_id, admin_id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'Session not found.' });

    await pool.execute(
      `INSERT INTO allocation_overrides (session_id, election_id, student_id, token_number, course_id, reason)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE course_id=VALUES(course_id), reason=VALUES(reason)`,
      [session_id, sessions[0].election_id, student_id, token_number, course_id, reason || null]
    );

    res.json({ success: true, message: 'Override saved.' });
  } catch (err) {
    console.error('saveOverride error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── EXPORT SESSION as CSV ─────────────────────────────────────
const exportSession = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { session_id } = req.params;
    const { by_section } = req.query; // ?by_section=1

    const [sessions] = await pool.execute(
      `SELECT s.*, e.admin_id, e.election_name, e.final_courses_per_student
       FROM allocation_sessions s JOIN elections e ON s.election_id=e.election_id
       WHERE s.session_id=? AND e.admin_id=?`,
      [session_id, admin_id]
    );
    if (!sessions.length) return res.status(404).json({ success: false, message: 'Session not found.' });

    const session = sessions[0];

    // Re-use getSessionDetail logic inline
    const [overrides] = await pool.execute(
      'SELECT * FROM allocation_overrides WHERE session_id=?', [session_id]
    );
    const overrideMap = {};
    for (const o of overrides) overrideMap[`${o.student_id}_${o.token_number}`] = o;

    const [baseRows] = await pool.execute(
      `SELECT ecr.*, s.name, s.register_number, s.section, s.full_student_id, s.email,
              c.course_name, c.subject_code
       FROM election_choice_results ecr
       JOIN students s ON ecr.student_id=s.student_id
       JOIN courses c ON ecr.course_id=c.course_id
       WHERE ecr.election_id=?
       ORDER BY s.section ASC, s.register_number ASC, ecr.token_number ASC`,
      [session.election_id]
    );

    // Apply overrides, build per-student map
    const byStudent = {};
    for (const row of baseRows) {
      const key = `${row.student_id}_${row.token_number}`;
      const ov = overrideMap[key];
      const courseId = ov ? ov.course_id : row.course_id;

      if (!byStudent[row.student_id]) {
        byStudent[row.student_id] = {
          register_number: row.register_number,
          full_student_id: row.full_student_id,
          name: row.name, email: row.email, section: row.section,
          courses: [],
        };
      }

      let courseName = row.course_name;
      let subjectCode = row.subject_code;
      if (ov) {
        const [cv] = await pool.execute(
          'SELECT course_name, subject_code FROM courses WHERE course_id=?', [ov.course_id]
        );
        if (cv[0]) { courseName = cv[0].course_name; subjectCode = cv[0].subject_code; }
      }

      byStudent[row.student_id].courses.push({
        course_name: courseName,
        subject_code: subjectCode,
        method: row.is_auto_assigned ? 'AUTO' : 'SELF',
        overridden: !!ov,
      });
    }

    const N = session.final_courses_per_student;
    let csv = `UCOS Allocation Export\nSession: "${session.session_name}"\nElection: "${session.election_name}"\nFinal: ${session.is_final ? 'YES' : 'No'}\n\n`;
    csv += 'Register No,Student ID,Name,Email,Section';
    for (let i = 1; i <= N; i++) csv += `,Course ${i},Code ${i},Method ${i}`;
    csv += '\n';

    const students = Object.values(byStudent);
    if (by_section === '1') students.sort((a, b) => a.section.localeCompare(b.section) || a.register_number.localeCompare(b.register_number));

    for (const s of students) {
      let line = `${s.register_number},${s.full_student_id},"${s.name}",${s.email},${s.section}`;
      for (let i = 0; i < N; i++) {
        const c = s.courses[i];
        line += c ? `,"${c.course_name}",${c.subject_code || ''},${c.method}` : ',,,';
      }
      csv += line + '\n';
    }

    const fname = `ucos_${session.session_name.replace(/[^a-z0-9]/gi,'_')}_${session_id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(csv);
  } catch (err) {
    console.error('exportSession error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  lockChoiceResults,
  getChoiceResults,
  getSessions,
  createSession,
  finalizeSession,
  getSessionDetail,
  saveOverride,
  exportSession,
};

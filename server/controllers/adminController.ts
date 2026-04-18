import bcrypt from 'bcryptjs';
import pool from '../config/db';
import csv from 'csv-parser';
import { Readable  } from 'stream';
import { sendStudentCredentials } from '../config/email';

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeText = (value = '') => value.trim();
const normalizeRegisterNumber = (value = '') => value.trim().toUpperCase();
const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const coreStudentColumns = ['register_number', 'reg_no', 'reg', 'name', 'student_name', 'email', 'section', 'p_profile_id', 'p_username'];
const allowedStudentColumns = ['serial_no', ...coreStudentColumns];
const buildTokenCode = (registerNumber, electionId, tokenNumber) => `A${registerNumber}-E${electionId}-T${tokenNumber}`;

const deleteStudentRecords = async (conn, studentIds = []) => {
  if (!studentIds.length) return;

  for (const studentId of studentIds) {
    await conn.execute('DELETE FROM allocation_overrides WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM assignment_details WHERE token_id IN (SELECT token_id FROM student_tokens WHERE student_id=?)', [studentId]);
    await conn.execute('DELETE FROM final_assignments WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM election_choice_results WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM election_messages WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM election_participants WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM student_tokens WHERE student_id=?', [studentId]);
    await conn.execute('DELETE FROM students WHERE student_id=?', [studentId]);
  }
};

// ── GET PENDING REGISTRATIONS ─────────────────────────────────
const getPending = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const [rows] = await pool.execute(
      `SELECT pending_id, name, register_number, email, section, status,
              is_email_verified, requested_at
       FROM pending_registrations
       WHERE admin_id=? ORDER BY requested_at DESC`,
      [admin_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── APPROVE / REJECT PENDING ──────────────────────────────────
const reviewPending = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { pending_id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const [rows] = await conn.execute(
      'SELECT * FROM pending_registrations WHERE pending_id=? AND admin_id=?',
      [pending_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found.' });

    const p = rows[0];

    if (action === 'reject') {
      await conn.execute(
        'UPDATE pending_registrations SET status=?, reviewed_at=NOW() WHERE pending_id=?',
        ['REJECTED', pending_id]
      );
      return res.json({ success: true, message: 'Registration rejected.' });
    }

    if (action === 'approve') {
      await conn.beginTransaction();

      // Get active election for admin
      const [elections] = await conn.execute(
        "SELECT election_id, final_courses_per_student FROM elections WHERE admin_id=? AND status != 'STOPPED' ORDER BY created_at DESC LIMIT 1",
        [admin_id]
      );
      const election = elections[0] || null;

      const full_student_id = `PA${p.register_number}`;

      const [result] = await conn.execute(
        `INSERT INTO students
         (register_number, full_student_id, name, email, password_hash, section, admin_id, election_id, is_approved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [p.register_number, full_student_id, p.name, p.email, p.password_hash,
         p.section, admin_id, election ? election.election_id : null]
      );
      const student_id = result.insertId;

      // Generate tokens if election exists
      if (election) {
        const [courses] = await conn.execute(
          'SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE',
          [election.election_id]
        );
        for (let i = 1; i <= courses.length; i++) {
          const token_code = buildTokenCode(p.register_number, election.election_id, i);
          await conn.execute(
            'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
            [student_id, election.election_id, i, token_code]
          );
        }
      }

      await conn.execute(
        'UPDATE pending_registrations SET status=?, reviewed_at=NOW() WHERE pending_id=?',
        ['APPROVED', pending_id]
      );

      await conn.commit();
      
      let impact = null;
      if (election) {
        const [cCount] = await conn.execute('SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election.election_id]);
        const courseCount = cCount[0].cnt;
        impact = {
          tokensIssued: courseCount,
          poolExpansion: courseCount,
          message: `By approving this student, you have issued ${courseCount} new tokens within the 10,000-slot universal pool. This increases current utilization by ${courseCount} units.`
        };
      }

      return res.json({ success: true, message: 'Student approved and account created.', impact });
    }

    res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('reviewPending error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── INJECT TEST VOTES ──────────────────────────────────────────
const injectTestVotes = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;
    const { votes } = req.body; // Array of { register_number, course_code, token_number }

    await conn.beginTransaction();

    // 1. Get Election details to ensure it is ACTIVE
    const [elections] = await conn.execute(
      "SELECT status, is_paused FROM elections WHERE election_id=? FOR SHARE",
      [election_id]
    );
    if (!elections.length || elections[0].status !== 'ACTIVE') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Election must be ACTIVE to inject test data.' });
    }

    let injected = 0;
    for (const v of votes) {
      // Find student by register_number
      const [st] = await conn.execute('SELECT student_id FROM students WHERE register_number=? AND election_id=?', [v.register_number, election_id]);
      if (!st.length) continue;
      const student_id = st[0].student_id;

      // Extract subject_name from the TSV (e.g., "4. Data Warehousing and Data Mining")
      const subjStr = v.Subject_Name || "";
      const subjMatch = subjStr.match(/\d+\.\s*(.+)/);
      const courseName = subjMatch ? subjMatch[1].trim() : subjStr.trim();
      
      // Find course_id by course_name
      const [co] = await conn.execute('SELECT course_id FROM courses WHERE course_name=? AND election_id=?', [courseName, election_id]);
      if (!co.length) continue;
      const course_id = co[0].course_id;

      // 1. Mark token as CONFIRMED directly
      const [tokens] = await conn.execute(
        "SELECT token_id, token_code, token_number FROM student_tokens WHERE student_id=? AND election_id=? AND token_number=? FOR UPDATE",
        [student_id, election_id, v.Token.replace('T', '')]
      );
      if (!tokens.length) continue;
      const token = tokens[0];

      // 2. Get next available seat (FCFS)
      const [seats] = await conn.execute(
        'SELECT seat_id, seat_code, seat_number FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number ASC LIMIT 1 FOR UPDATE',
        [election_id]
      );
      if (!seats.length) continue;
      const seat = seats[0];

      // 3. Atomically claim seat
      await conn.execute(
        'UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?',
        [course_id, token.token_id, seat.seat_id]
      );

      // 4. Mark token as CONFIRMED
      await conn.execute(
        "UPDATE student_tokens SET status='CONFIRMED', course_id=?, seat_id=?, timestamp_booked=NOW() WHERE token_id=?",
        [course_id, seat.seat_id, token.token_id]
      );

      injected++;
    }

    await conn.commit();
    res.json({ success: true, message: `Successfully injected ${injected} test votes.` });
  } catch (err) {
    await conn.rollback();
    console.error('injectTestVotes error:', err);
    res.status(500).json({ success: false, message: 'Server error during injection.' });
  } finally {
    conn.release();
  }
};

// ── UPLOAD STUDENTS VIA CSV ───────────────────────────────────
const uploadStudentsCSV = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
    
    // TEMPORARY FOR TESTING: Admin requested all uploaded students to have 'Ptu@123' as default password.
    // We dynamically hash it here so they can log in immediately for the test.
    const invitedDummyHash = await bcrypt.hash('Ptu@123', 12);

    // Get active election
    const [elections] = await conn.execute(
      "SELECT election_id, final_courses_per_student FROM elections WHERE admin_id=? AND status='NOT_STARTED' ORDER BY created_at DESC LIMIT 1",
      [admin_id]
    );
    const election = elections[0] || null;

    let courses = [];
    if (election) {
      const [c] = await conn.execute(
        'SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE',
        [election.election_id]
      );
      courses = c;
    }

    const students = [];
    const rowErrors = [];
    const duplicateMessages = [];
    let headers = [];
    const stream = Readable.from(req.file.buffer.toString());
    await new Promise((resolve, reject) => {
      stream.pipe(csv())
        .on('headers', (incomingHeaders) => {
          headers = incomingHeaders.map((header) => normalizeText(header).toLowerCase());
        })
        .on('data', (row) => {
          const rowNumber = students.length + rowErrors.length + 2;
          const email = normalizeEmail(row.email || '');
          if (!email) {
            rowErrors.push(`Row ${rowNumber}: email is required`);
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            rowErrors.push(`Row ${rowNumber}: email format is invalid`);
            return;
          }

          const data = { email, rowNumber, ...row };
          const extra = {};
          Object.keys(row).forEach(k => {
            const key = normalizeText(k).toLowerCase();
            if (key === 'email') return;
            if (coreStudentColumns.includes(key)) {
              data[key] = normalizeText(row[k]);
            } else if (key !== 'serial_no') {
              extra[key] = normalizeText(row[k]);
            }
          });
          data.metadata = extra;
          students.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!headers.includes('email')) {
      return res.status(400).json({ success: false, message: 'CSV must include email column as the primary key.' });
    }
    if (rowErrors.length) {
      return res.status(400).json({
        success: false,
        message: `CSV validation failed. ${rowErrors[0]}`,
        errors: rowErrors.slice(0, 10),
      });
    }

    if (!students.length) {
      return res.status(400).json({ success: false, message: 'No valid rows found in CSV.' });
    }

    await conn.beginTransaction();
    let created = 0, updated = 0, skipped = 0;

    for (const s of students) {
      try {
        const [dup] = await conn.execute(
          'SELECT student_id, email, register_number FROM students WHERE email=? AND admin_id=?',
          [s.email, admin_id]
        );
        let student_id;

        if (dup.length) {
          student_id = dup[0].student_id;
          
          const updates = [];
          const values = [];
          if (s.register_number || s.reg_no || s.reg) {
            const reg = normalizeRegisterNumber(s.register_number || s.reg_no || s.reg);
            updates.push('register_number=?, full_student_id=?');
            values.push(reg, `PA${reg}`);
          }
          if (s.name || s.student_name) {
            updates.push('name=?');
            values.push(s.name || s.student_name);
          }
          if (s.section) {
            updates.push('section=?');
            values.push(s.section);
          }
          if (s.p_profile_id) {
            updates.push('p_profile_id=?');
            values.push(s.p_profile_id);
          }
          if (s.p_username) {
            updates.push('p_username=?');
            values.push(s.p_username);
          }

          if (updates.length) {
            await conn.execute(
              `UPDATE students SET ${updates.join(', ')} WHERE student_id=?`,
              [...values, student_id]
            );
          }

          if (Object.keys(s.metadata).length) {
            const [metaRows] = await conn.execute('SELECT metadata FROM students WHERE student_id=?', [student_id]);
            let currentMeta = {};
            try { currentMeta = JSON.parse(metaRows[0].metadata || '{}'); } catch {}
            const newMeta = { ...currentMeta, ...s.metadata };
            await conn.execute('UPDATE students SET metadata=? WHERE student_id=?', [JSON.stringify(newMeta), student_id]);
          }

          updated++;
        } else {
          const reg = s.register_number || s.reg_no || s.reg || 'PENDING';
          const [result] = await conn.execute(
            `INSERT INTO students
             (register_number, full_student_id, name, email, password_hash, section, admin_id, election_id, is_approved, metadata, p_profile_id, p_username)
             VALUES (?,?,?,?,?,?,?,?,TRUE,?,?,?)`,
            [
              reg, 
              reg === 'PENDING' ? 'PENDING' : `PA${reg}`, 
              s.name || s.student_name || 'Invited Participant', 
              s.email, 
              invitedDummyHash, 
              s.section || 'A', 
              admin_id,
              election ? election.election_id : null,
              JSON.stringify(s.metadata),
              s.p_profile_id || null,
              s.p_username || null
            ]
          );
          student_id = result.insertId;
          created++;
        }

        /* Skip automated emails for now as they contain credentials. Admin now only provides the invite list. */
      } catch (e) {
        skipped++;
        duplicateMessages.push(`Row ${s.rowNumber}: could not be imported`);
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: `CSV processed: ${created} students created, ${updated} updated, ${skipped} skipped.`,
      created, updated, skipped,
      notes: [
        ...duplicateMessages.slice(0, 10),
      ].filter(Boolean),
    });
  } catch (err) {
    await conn.rollback();
    console.error('uploadStudentsCSV error:', err);
    res.status(500).json({ success: false, message: 'Server error processing CSV.' });
  } finally {
    conn.release();
  }
};

// ── GET ALL STUDENTS ──────────────────────────────────────────
const getStudents = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { section, search } = req.query;

    let query = `
      SELECT s.student_id, s.register_number, s.full_student_id, s.name,
             s.email, s.section, s.is_approved, s.created_at,
              COUNT(CASE WHEN st.status='CONFIRMED' THEN 1 END) as confirmed_count,
              COUNT(CASE WHEN st.status IN ('BOOKED','CONFIRMED','AUTO') THEN 1 END) as booked_count
      FROM students s
      LEFT JOIN student_tokens st ON s.student_id = st.student_id
      WHERE s.admin_id=?
    `;
    const params = [admin_id];

    if (section) { query += ' AND s.section=?'; params.push(section); }
    if (search) { query += ' AND (s.name LIKE ? OR s.register_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' GROUP BY s.student_id ORDER BY s.register_number ASC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('getStudents error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE STUDENT ────────────────────────────────────────────
const deleteStudent = async (req, res) => {
  const conn = await pool.getConnection();
  let inTransaction = false;
  try {
    const admin_id = req.user.id;
    const { student_id } = req.params;

    const [rows] = await conn.execute(
      'SELECT student_id FROM students WHERE student_id=? AND admin_id=?',
      [student_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    await conn.beginTransaction();
    inTransaction = true;
    await deleteStudentRecords(conn, [student_id]);
    await conn.commit();
    inTransaction = false;
    res.json({ success: true, message: 'Student removed.' });
  } catch (err) {
    if (inTransaction) await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

const bulkDeleteStudents = async (req, res) => {
  const conn = await pool.getConnection();
  let inTransaction = false;
  try {
    const admin_id = req.user.id;
    const rawStudentIds = Array.isArray(req.body.student_ids) ? req.body.student_ids : [];
    const studentIds = rawStudentIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!studentIds.length) {
      return res.status(400).json({ success: false, message: 'student_ids is required.' });
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const [rows] = await conn.execute(
      `SELECT student_id FROM students WHERE admin_id=? AND student_id IN (${placeholders})`,
      [admin_id, ...studentIds]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No matching students found.' });
    }

    const matchedIds = rows.map((row) => row.student_id);

    await conn.beginTransaction();
    inTransaction = true;
    await deleteStudentRecords(conn, matchedIds);
    await conn.commit();
    inTransaction = false;

    res.json({
      success: true,
      message: `${matchedIds.length} students removed.`,
      deleted: matchedIds.length,
    });
  } catch (err) {
    if (inTransaction) await conn.rollback();
    console.error('bulkDeleteStudents error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── GET SINGLE STUDENT ────────────────────────────────────────
const getStudentById = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { student_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT s.*, e.election_name, e.status as election_status
       FROM students s
       LEFT JOIN elections e ON s.election_id = e.election_id
       WHERE s.student_id=? AND s.admin_id=?`,
      [student_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });
    const student = rows[0];

    const [tokens] = await pool.execute(
      `SELECT st.*, c.course_name, c.subject_code, se.seat_code
       FROM student_tokens st
       LEFT JOIN courses c ON st.course_id = c.course_id
       LEFT JOIN seats se ON st.seat_id = se.seat_id
       WHERE st.student_id=?
       ORDER BY st.token_number ASC`,
      [student_id]
    );
    res.json({ success: true, data: { ...student, tokens } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── UPDATE ADMIN PROFILE ──────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { admin_name, college_name } = req.body;
    if (!admin_name || !college_name) {
      return res.status(400).json({ success: false, message: 'Name and institution required.' });
    }
    await pool.execute(
      'UPDATE admins SET admin_name=?, college_name=? WHERE admin_id=?',
      [admin_name, college_name, admin_id]
    );
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both passwords required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    const [rows] = await pool.execute('SELECT password_hash FROM admins WHERE admin_id=?', [admin_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin not found.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.execute('UPDATE admins SET password_hash=? WHERE admin_id=?', [hash, admin_id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const bulkReviewPending = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { pending_ids, action } = req.body; // array of ids, 'approve' or 'reject'

    if (!Array.isArray(pending_ids) || !pending_ids.length) {
      return res.status(400).json({ success: false, message: 'pending_ids is required.' });
    }

    await conn.beginTransaction();

    // Get active election for admin
    let election = null;
    let courses = [];
    if (action === 'approve') {
      const [elections] = await conn.execute(
        "SELECT election_id FROM elections WHERE admin_id=? AND status != 'STOPPED' ORDER BY created_at DESC LIMIT 1",
        [admin_id]
      );
      election = elections[0] || null;
      if (election) {
        const [c] = await conn.execute(
          'SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE',
          [election.election_id]
        );
        courses = c;
      }
    }

    const processed = [];
    for (const pid of pending_ids) {
      const [rows] = await conn.execute(
        'SELECT * FROM pending_registrations WHERE pending_id=? AND admin_id=? AND status=?',
        [pid, admin_id, 'PENDING']
      );
      if (!rows.length) continue;

      const p = rows[0];

      if (action === 'reject') {
        await conn.execute(
          'UPDATE pending_registrations SET status=?, reviewed_at=NOW() WHERE pending_id=?',
          ['REJECTED', pid]
        );
      } else if (action === 'approve') {
        const full_student_id = `PA${p.register_number}`;
        
        // Avoid duplicate approved students if they already exist
        const [exists] = await conn.execute(
          'SELECT student_id FROM students WHERE (register_number=? OR email=?) AND admin_id=?',
          [p.register_number, p.email, admin_id]
        );

        let student_id;
        if (exists.length) {
          student_id = exists[0].student_id;
          await conn.execute(
            'UPDATE students SET is_approved=TRUE, election_id=? WHERE student_id=?',
            [election ? election.election_id : null, student_id]
          );
        } else {
          const [result] = await conn.execute(
            `INSERT INTO students 
             (register_number, full_student_id, name, email, password_hash, section, admin_id, election_id, is_approved)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [p.register_number, full_student_id, p.name, p.email, p.password_hash, 
             p.section, admin_id, election ? election.election_id : null]
          );
          student_id = result.insertId;
        }

        // Generate tokens
        if (election && courses.length > 0) {
          const [existingTokens] = await conn.execute(
            'SELECT token_id FROM student_tokens WHERE student_id=? AND election_id=?',
            [student_id, election.election_id]
          );
          if (!existingTokens.length) {
            for (let i = 1; i <= courses.length; i++) {
              const token_code = buildTokenCode(p.register_number, election.election_id, i);
              await conn.execute(
                'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
                [student_id, election.election_id, i, token_code]
              );
            }
          }
        }

        await conn.execute(
          'UPDATE pending_registrations SET status=?, reviewed_at=NOW() WHERE pending_id=?',
          ['APPROVED', pid]
        );
      }
      processed.push(pid);
    }

    await conn.commit();

    let impact = null;
    if (election && processed.length > 0) {
      const [cCount] = await conn.execute('SELECT COUNT(*) as cnt FROM courses WHERE election_id=? AND is_active=TRUE', [election.election_id]);
      const courseCount = cCount[0].cnt;
      const totalTokens = courseCount * processed.length;
      impact = {
        tokensIssued: totalTokens,
        poolExpansion: totalTokens,
        message: `By approving ${processed.length} students, you have issued ${totalTokens} new tokens within the 10,000-slot universal pool. This increases current utilization by ${totalTokens} units.`
      };
    }

    res.json({ success: true, message: `${processed.length} registrations processed.`, count: processed.length, impact });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('bulkReviewPending error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

export { getPending, reviewPending, bulkReviewPending, uploadStudentsCSV, getStudents, getStudentById, deleteStudent, bulkDeleteStudents, updateProfile, changePassword, injectTestVotes };

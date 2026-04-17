const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const csv = require('csv-parser');
const { Readable } = require('stream');
const XLSX = require('xlsx');
const { generatePassword, sendWelcomeEmail } = require('../config/email');

const normalizeReg = (value) => {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (!text) return '';
  const digits = text.match(/\d+/g);
  return digits ? digits.join('') : text.replace(/\s+/g, '');
};

const normalizeSection = (value, reg) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'A' || raw === 'B') return raw;
  const regNum = parseInt(reg, 10);
  if (!Number.isNaN(regNum)) return regNum <= 60 ? 'A' : 'B';
  return 'A';
};

const rowToStudent = (row) => {
  const reg = normalizeReg(
    row.register_number ?? row.reg_no ?? row.reg ?? row.Register_Number ?? row.Student_ID ?? row['Student ID']
  );
  const name = String(
    row.name ?? row.student_name ?? row.Name ?? row['Student Name'] ?? (reg ? `Student ${reg}` : '')
  ).trim();
  const email = String(
    row.email ?? row.Email ?? (reg ? `student${reg}@test.local` : '')
  ).trim().toLowerCase();
  const section = normalizeSection(
    row.section ?? row.Section ?? row['Original Section'] ?? row['Section'],
    reg
  );
  if (!reg || !name || !email) return null;
  return { reg, name, email, section };
};

const detectDelimiter = (text) => {
  const firstLine = (text.split(/\r?\n/).find((line) => line.trim()) || '');
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  return ',';
};

const parseCsvRows = async (buffer) => {
  const rows = [];
  const text = buffer.toString();
  const separator = detectDelimiter(text);
  const stream = Readable.from(text);
  await new Promise((resolve, reject) => {
    stream.pipe(csv({ separator }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  return rows;
};

const parseXlsxRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

const parseUploadedRows = async (file) => {
  const ext = (file.originalname || '').toLowerCase();
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
    return parseXlsxRows(file.buffer);
  }
  return parseCsvRows(file.buffer);
};

const parseTokenNumber = (value) => {
  const text = String(value || '').trim().toUpperCase();
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
};

const toSqlTimestamp = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const dt = new Date(text.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 19).replace('T', ' ');
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
          const token_code = `A${p.register_number}-T${i}`;
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
      return res.json({ success: true, message: 'Student approved and account created.' });
    }

    res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject.' });
  } catch (err) {
    await conn.rollback();
    console.error('reviewPending error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
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

    // Get active election
    const [elections] = await conn.execute(
      "SELECT election_id, final_courses_per_student FROM elections WHERE admin_id=? AND status='NOT_STARTED' ORDER BY created_at DESC LIMIT 1",
      [admin_id]
    );
    const election = elections[0] || null;

    // Get courses if election exists
    let courses = [];
    if (election) {
      const [c] = await conn.execute(
        'SELECT course_id FROM courses WHERE election_id=? AND is_active=TRUE',
        [election.election_id]
      );
      courses = c;
    }

    const rawRows = await parseUploadedRows(req.file);
    const students = [];
    const seen = new Set();
    for (const row of rawRows) {
      const student = rowToStudent(row);
      if (!student) continue;
      const key = `${student.reg}|${student.email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      students.push(student);
    }

    if (!students.length) {
      return res.status(400).json({ success: false, message: 'No valid rows found in file.' });
    }

    await conn.beginTransaction();
    let created = 0, skipped = 0, emailFailed = 0;

    for (const s of students) {
      try {
        const [dup] = await conn.execute(
          'SELECT student_id FROM students WHERE email=? OR register_number=?',
          [s.email, s.reg]
        );
        if (dup.length) { skipped++; continue; }

        const tempPassword = generatePassword();
        const hash = await bcrypt.hash(tempPassword, 10);
        const full_id = `PA${s.reg}`;

        const [result] = await conn.execute(
          `INSERT INTO students
           (register_number, full_student_id, name, email, password_hash, section, admin_id, election_id, is_approved, force_password_change)
           VALUES (?,?,?,?,?,?,?,?,TRUE,TRUE)`,
          [s.reg, full_id, s.name, s.email, hash, s.section, admin_id,
           election ? election.election_id : null]
        );
        const student_id = result.insertId;

        // Generate tokens
        if (election && courses.length > 0) {
          for (let i = 1; i <= courses.length; i++) {
            const token_code = `A${s.reg}-T${i}`;
            await conn.execute(
              'INSERT INTO student_tokens (student_id, election_id, token_number, token_code) VALUES (?,?,?,?)',
              [student_id, election.election_id, i, token_code]
            );
          }
        }
        try {
          await sendWelcomeEmail(s.email, s.name, tempPassword, admin_id);
        } catch (emailErr) {
          console.warn(`Welcome email failed for ${s.email}:`, emailErr.message);
          emailFailed++;
        }
        created++;
      } catch (e) {
        skipped++;
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: `CSV processed: ${created} students created, ${skipped} skipped.`,
      created, skipped,
      emailsSent: created - emailFailed,
      emailFailed,
    });
  } catch (err) {
    await conn.rollback();
    console.error('uploadStudentsCSV error:', err);
    res.status(500).json({ success: false, message: 'Server error processing CSV.' });
  } finally {
    conn.release();
  }
};

// ── IMPORT MASTER BOOKING / ADMIN-ASSIGNMENT DATA ───────────────────
const importMasterAllocationData = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const [elections] = await conn.execute(
      "SELECT election_id FROM elections WHERE admin_id=? AND status='STOPPED' ORDER BY created_at DESC LIMIT 1",
      [admin_id]
    );
    const election = elections[0];
    if (!election) {
      return res.status(400).json({ success: false, message: 'No stopped election found for import.' });
    }

    const rows = await parseUploadedRows(req.file);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows found in file.' });
    }

    await conn.beginTransaction();
    let imported = 0;
    let skipped = 0;
    const reasons = {};

    for (const row of rows) {
      try {
        const reg = normalizeReg(row.register_number ?? row.Register_Number ?? row.Student_ID ?? row['Student ID']);
        const tokenNumber = parseTokenNumber(row.Token ?? row.token ?? row.Token_Priority ?? row.token_number);
        const subjectName = String(row.Subject_Name ?? row.subject_name ?? row.Course ?? row.course_name ?? '').trim();
        const seatNumberRaw = String(row.Seat_Number ?? row.seat_number ?? row.Seat ?? '').trim();
        const seatNumber = seatNumberRaw ? parseInt(seatNumberRaw, 10) : NaN;
        const allocationMethod = String(row.Allocation_Method ?? row.allocation_method ?? '').trim().toLowerCase();
        const timestampBooked = toSqlTimestamp(row.Booking_Timestamp ?? row.booking_timestamp ?? row.Timestamp);

        if (!reg || Number.isNaN(tokenNumber) || !subjectName) {
          skipped++;
          reasons.invalid_format = (reasons.invalid_format || 0) + 1;
          continue;
        }

        const [students] = await conn.execute(
          'SELECT student_id FROM students WHERE admin_id=? AND register_number=? LIMIT 1',
          [admin_id, reg]
        );
        if (!students.length) {
          skipped++;
          reasons.student_not_found = (reasons.student_not_found || 0) + 1;
          continue;
        }
        const studentId = students[0].student_id;

        const [courses] = await conn.execute(
          'SELECT course_id FROM courses WHERE election_id=? AND course_name=? LIMIT 1',
          [election.election_id, subjectName]
        );
        if (!courses.length) {
          skipped++;
          reasons.course_not_found = (reasons.course_not_found || 0) + 1;
          continue;
        }
        const courseId = courses[0].course_id;

        const [tokens] = await conn.execute(
          'SELECT token_id FROM student_tokens WHERE student_id=? AND election_id=? AND token_number=? LIMIT 1',
          [studentId, election.election_id, tokenNumber]
        );
        if (!tokens.length) {
          skipped++;
          reasons.token_not_found = (reasons.token_not_found || 0) + 1;
          continue;
        }
        const tokenId = tokens[0].token_id;

        let seatId = null;
        if (!Number.isNaN(seatNumber)) {
          const [seats] = await conn.execute(
            'SELECT seat_id FROM seats WHERE election_id=? AND seat_number=? LIMIT 1',
            [election.election_id, seatNumber]
          );
          if (seats.length) seatId = seats[0].seat_id;
        }

        const isAuto = allocationMethod.includes('admin') || allocationMethod.includes('auto');
        const tokenStatus = isAuto ? 'AUTO' : 'BOOKED';

        await conn.execute(
          `UPDATE student_tokens
           SET course_id=?, seat_id=?, status=?, is_auto_assigned=?, timestamp_booked=?
           WHERE token_id=?`,
          [courseId, seatId, tokenStatus, isAuto, timestampBooked, tokenId]
        );

        if (seatId) {
          await conn.execute(
            `UPDATE seats
             SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=COALESCE(?, booked_at)
             WHERE seat_id=?`,
            [courseId, tokenId, timestampBooked, seatId]
          );
        }

        imported++;
      } catch (rowErr) {
        skipped++;
        reasons.row_error = (reasons.row_error || 0) + 1;
      }
    }

    await conn.commit();
    return res.json({
      success: true,
      message: `Import completed: ${imported} rows applied, ${skipped} skipped.`,
      imported,
      skipped,
      reasons,
      election_id: election.election_id,
    });
  } catch (err) {
    await conn.rollback();
    console.error('importMasterAllocationData error:', err);
    return res.status(500).json({ success: false, message: 'Server error importing master allocation data.' });
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
  try {
    const admin_id = req.user.id;
    const { student_id } = req.params;

    const [rows] = await pool.execute(
      'SELECT student_id FROM students WHERE student_id=? AND admin_id=?',
      [student_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    await pool.execute('DELETE FROM students WHERE student_id=?', [student_id]);
    res.json({ success: true, message: 'Student removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
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

module.exports = {
  getPending,
  reviewPending,
  uploadStudentsCSV,
  importMasterAllocationData,
  getStudents,
  getStudentById,
  deleteStudent,
  updateProfile,
  changePassword,
};

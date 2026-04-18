import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { sendOTP  } from '../config/email';

// Generate 6-digit OTP
const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeText = (value = '') => value.trim();
const normalizeAdminId = (value = '') => value.trim().toUpperCase();
const normalizeRegisterNumber = (value = '') => value.trim().toUpperCase();
const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

// Generate Admin ID: ADM-YYYY-NNN
const genAdminId = async () => {
  const year = new Date().getFullYear();
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as cnt FROM admins WHERE admin_id LIKE ?',
    [`ADM-${year}-%`]
  );
  const seq = String(rows[0].cnt + 1).padStart(3, '0');
  return `ADM-${year}-${seq}`;
};

// Dormant future flow note:
// The invite-first onboarding helpers that use an `election_invites` table are intentionally
// kept out of the active path to preserve the current self-registration flow.
// Future evolution guidance:
// - current live flow is Admin ID + student self-registration + OTP + admin approval
// - future flow may switch to election-link onboarding with unique mailed credentials
// - keep these note lines in place so future AI/dev updates know what can be revived
//   and why it is still commented today

// ── ADMIN REGISTER ────────────────────────────────────────────
const adminRegister = async (req, res) => {
  try {
    const admin_name = normalizeText(req.body.admin_name);
    const college_name = normalizeText(req.body.college_name);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';

    if (!admin_name || !college_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const shouldSkipEmailVerification = !smtpConfigured();

    // Allow incomplete registrations to retry cleanly instead of getting stuck forever.
    const [existing] = await pool.execute('SELECT admin_id, admin_name, is_verified FROM admins WHERE email=?', [email]);
    if (existing.length > 0) {
      const admin = existing[0];
      if (admin.is_verified) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const otp = shouldSkipEmailVerification ? null : genOTP();
      const otp_expires = shouldSkipEmailVerification ? null : new Date(Date.now() + 10 * 60 * 1000);

      await pool.execute(
        `UPDATE admins
         SET admin_name=?, college_name=?, password_hash=?, is_verified=?, otp_code=?, otp_expires_at=?, updated_at=NOW()
         WHERE email=?`,
        [admin_name, college_name, password_hash, shouldSkipEmailVerification, otp, otp_expires, email]
      );

      if (!shouldSkipEmailVerification) {
        try { await sendOTP(email, otp, admin_name); } catch(e) { console.warn('Email send failed:', e.message); }
      }

      return res.status(200).json({
        success: true,
        message: shouldSkipEmailVerification
          ? 'Registration updated. Email verification skipped because SMTP is not configured.'
          : 'Registration already exists but was not verified. A new OTP has been sent.',
        admin_id: admin.admin_id,
        email,
        skipVerification: shouldSkipEmailVerification,
      });
    }

    const admin_id = await genAdminId();
    const password_hash = await bcrypt.hash(password, 12);
    const otp = shouldSkipEmailVerification ? null : genOTP();
    const otp_expires = shouldSkipEmailVerification ? null : new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.execute(
      `INSERT INTO admins (admin_id, admin_name, college_name, email, password_hash, is_verified, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [admin_id, admin_name, college_name, email, password_hash, shouldSkipEmailVerification, otp, otp_expires]
    );

    if (!shouldSkipEmailVerification) {
      // Send OTP (non-blocking - don't fail if email fails)
      try { await sendOTP(email, otp, admin_name); } catch(e) { console.warn('Email send failed:', e.message); }
    }

    res.status(201).json({
      success: true,
      message: shouldSkipEmailVerification
        ? 'Registration successful. Email verification skipped because SMTP is not configured.'
        : 'Registration successful. Check your email for OTP.',
      admin_id,
      email,
      skipVerification: shouldSkipEmailVerification,
    });
  } catch (err) {
    console.error('adminRegister error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeText(req.body.otp);
    const role = normalizeText(req.body.role);

    if (role === 'admin') {
      const [rows] = await pool.execute(
        'SELECT * FROM admins WHERE email=? AND otp_code=? AND otp_expires_at > NOW()',
        [email, otp]
      );
      if (!rows.length) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
      }
      await pool.execute(
        'UPDATE admins SET is_verified=TRUE, otp_code=NULL, otp_expires_at=NULL WHERE email=?',
        [email]
      );
      return res.json({ success: true, message: 'Email verified successfully.' });
    }

    if (role === 'pending_student') {
      const [rows] = await pool.execute(
        'SELECT * FROM pending_registrations WHERE email=? AND otp_code=? AND otp_expires_at > NOW()',
        [email, otp]
      );
      if (!rows.length) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
      }
      await pool.execute(
        'UPDATE pending_registrations SET is_email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL WHERE email=?',
        [email]
      );
      return res.json({ success: true, message: 'Email verified. Awaiting admin approval.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid role.' });
  } catch (err) {
    console.error('verifyOTP error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── RESEND OTP ────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const role = normalizeText(req.body.role);
    const otp = genOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (role === 'admin') {
      const [rows] = await pool.execute('SELECT admin_name FROM admins WHERE email=?', [email]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Email not found.' });
      if (!smtpConfigured()) {
        return res.status(400).json({ success: false, message: 'Email delivery is not configured on this deployment.' });
      }
      await pool.execute('UPDATE admins SET otp_code=?, otp_expires_at=? WHERE email=?', [otp, expires, email]);
      try { await sendOTP(email, otp, rows[0].admin_name); } catch(e) {}
      return res.json({ success: true, message: 'OTP resent.' });
    }

    if (role === 'pending_student') {
      const [rows] = await pool.execute(
        'SELECT name FROM pending_registrations WHERE email=? AND status=?',
        [email, 'PENDING']
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Pending registration not found.' });
      await pool.execute(
        'UPDATE pending_registrations SET otp_code=?, otp_expires_at=? WHERE email=?',
        [otp, expires, email]
      );
      try { await sendOTP(email, otp, rows[0].name); } catch(e) {}
      return res.json({ success: true, message: 'OTP resent.' });
    }

    return res.status(400).json({ success: false, message: 'Invalid role.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── ADMIN LOGIN ───────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const [rows] = await pool.execute('SELECT * FROM admins WHERE email=?', [email]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const admin = rows[0];

    if (!admin.is_verified) {
      return res.status(403).json({ success: false, message: 'Email not verified. Please verify OTP first.', needsVerification: true, email });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: admin.admin_id, role: 'admin', email: admin.email, name: admin.admin_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        admin_id: admin.admin_id,
        admin_name: admin.admin_name,
        college_name: admin.college_name,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('adminLogin error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── STUDENT SELF-REGISTER ─────────────────────────────────────
const studentSelfRegister = async (req, res) => {
  try {
    const name = normalizeText(req.body.name);
    const register_number = normalizeRegisterNumber(req.body.register_number);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const section = normalizeText(req.body.section).toUpperCase();
    const admin_id = normalizeAdminId(req.body.admin_id);

    if (!name || !register_number || !email || !password || !section || !admin_id) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Check admin exists
    const [admins] = await pool.execute('SELECT admin_id FROM admins WHERE admin_id=?', [admin_id]);
    if (!admins.length) {
      return res.status(404).json({ success: false, message: 'Admin ID not found.' });
    }

    // Let users retry a pending/unverified request with fresh credentials and OTP.
    const [dup] = await pool.execute(
      'SELECT pending_id, status FROM pending_registrations WHERE email=? OR register_number=? ORDER BY pending_id DESC LIMIT 1',
      [email, register_number]
    );

    const [dupStudent] = await pool.execute(
      'SELECT student_id, password_hash FROM students WHERE email=? OR register_number=?',
      [email, register_number]
    );
    
    const invitedDummyHash = '$2a$12$DUMMYHASHFORINVITEDSTUDENTS';
    const isInvitedClaim = dupStudent.length > 0 && dupStudent[0].password_hash === invitedDummyHash;

    if (dupStudent.length && !isInvitedClaim) {
      return res.status(409).json({ success: false, message: 'Student already registered.' });
    }

    if (isInvitedClaim) {
      // Allow invited student to claim account by setting password
      const password_hash = await bcrypt.hash(password, 12);
      const otp = genOTP();
      const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
      
      await pool.execute(
        'UPDATE students SET name=?, password_hash=?, section=?, is_verified=FALSE WHERE student_id=?',
        [name, password_hash, section, dupStudent[0].student_id]
      );
      
      // Still needs OTP verification to activate
      await pool.execute(
        'INSERT INTO pending_registrations (name, register_number, email, password_hash, section, admin_id, otp_code, otp_expires_at, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [name, register_number, email, password_hash, section, admin_id, otp, otp_expires, 'CLAIMING']
      );
      
      try { await sendOTP(email, otp, name); } catch(e) {}
      return res.status(200).json({ success: true, message: 'Invitation found! Please verify OTP to activate your account.', email });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const otp = genOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

    if (dup.length) {
      const pending = dup[0];
      if (pending.status === 'PENDING') {
        await pool.execute(
          `UPDATE pending_registrations
           SET name=?, register_number=?, email=?, password_hash=?, section=?, admin_id=?,
               otp_code=?, otp_expires_at=?, is_email_verified=FALSE, reviewed_at=NULL
           WHERE pending_id=?`,
          [name, register_number, email, password_hash, section, admin_id, otp, otp_expires, pending.pending_id]
        );
      } else {
        return res.status(409).json({ success: false, message: 'Email or register number already submitted.' });
      }
    } else {
      await pool.execute(
        `INSERT INTO pending_registrations
         (name, register_number, email, password_hash, section, admin_id, otp_code, otp_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, register_number, email, password_hash, section, admin_id, otp, otp_expires]
      );
    }

    try { await sendOTP(email, otp, name); } catch(e) { console.warn('Email failed:', e.message); }

    res.status(201).json({
      success: true,
      message: 'Request submitted. Check email for OTP to verify.',
      email,
    });
  } catch (err) {
    console.error('studentSelfRegister error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/*
Dormant future version only:

const buildInviteMetadata = ...
const upsertInvitedStudent = ...
const startInvitedStudentRegistration = ...
const verifyInvitedStudentOTP = ...

Why dormant:
- The current production/student flow is self-registration + OTP + admin approval.
- The invite-first election-link onboarding was started early and would change the live UX.
- These comment lines are intentionally preserved so future evolution can revisit this design,
  understand the earlier intent, and uncomment or restore it safely if needed.
*/

// ── STUDENT LOGIN ─────────────────────────────────────────────
const studentLogin = async (req, res) => {
  try {
    const emailOrRegister = normalizeText(req.body.email);
    const email = normalizeEmail(emailOrRegister);
    const register_number = normalizeRegisterNumber(emailOrRegister);
    const password = req.body.password || '';
    const admin_id = normalizeAdminId(req.body.admin_id);

    if (!emailOrRegister || !password || !admin_id) {
      return res.status(400).json({ success: false, message: 'Email, password, and Admin ID required.' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE admin_id=? AND (email=? OR register_number=?)',
      [admin_id, email, register_number]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or Admin ID.' });
    }

    const student = rows[0];

    if (!student.is_approved) {
      return res.status(403).json({ success: false, message: 'Account pending admin approval.' });
    }

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        id: student.student_id,
        role: 'student',
        email: student.email,
        name: student.name,
        admin_id: student.admin_id,
        register_number: student.register_number,
        section: student.section,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        student_id: student.student_id,
        full_student_id: student.full_student_id,
        register_number: student.register_number,
        name: student.name,
        email: student.email,
        section: student.section,
        admin_id: student.admin_id,
        role: 'student',
      },
    });
  } catch (err) {
    console.error('studentLogin error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { adminRegister,
  verifyOTP,
  resendOTP,
  adminLogin,
  studentSelfRegister,
  studentLogin,
 };

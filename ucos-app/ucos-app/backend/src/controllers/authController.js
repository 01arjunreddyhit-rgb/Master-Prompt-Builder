const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendOTP } = require('../config/email');

// Generate 6-digit OTP
const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

// ── ADMIN REGISTER ────────────────────────────────────────────
const adminRegister = async (req, res) => {
  try {
    const { admin_name, college_name, email, password } = req.body;

    if (!admin_name || !college_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Check duplicate email
    const [existing] = await pool.execute('SELECT admin_id FROM admins WHERE email=?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const admin_id = await genAdminId();
    const password_hash = await bcrypt.hash(password, 12);
    const otp = genOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.execute(
      `INSERT INTO admins (admin_id, admin_name, college_name, email, password_hash, is_verified, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, FALSE, ?, ?)`,
      [admin_id, admin_name, college_name, email, password_hash, otp, otp_expires]
    );

    // Send OTP (non-blocking - don't fail if email fails)
    try { await sendOTP(email, otp, admin_name); } catch(e) { console.warn('Email send failed:', e.message); }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for OTP.',
      admin_id,
      email,
    });
  } catch (err) {
    console.error('adminRegister error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ── VERIFY OTP ────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, role } = req.body;

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
    const { email, role } = req.body;
    const otp = genOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (role === 'admin') {
      const [rows] = await pool.execute('SELECT admin_name FROM admins WHERE email=?', [email]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Email not found.' });
      await pool.execute('UPDATE admins SET otp_code=?, otp_expires_at=? WHERE email=?', [otp, expires, email]);
      try { await sendOTP(email, otp, rows[0].admin_name); } catch(e) {}
    }

    res.json({ success: true, message: 'OTP resent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── ADMIN LOGIN ───────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

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
    const { name, register_number, email, password, section, admin_id } = req.body;

    if (!name || !register_number || !email || !password || !section || !admin_id) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }

    // Check admin exists
    const [admins] = await pool.execute('SELECT admin_id FROM admins WHERE admin_id=?', [admin_id]);
    if (!admins.length) {
      return res.status(404).json({ success: false, message: 'Admin ID not found.' });
    }

    // Check duplicate
    const [dup] = await pool.execute(
      'SELECT pending_id FROM pending_registrations WHERE email=? OR register_number=?',
      [email, register_number]
    );
    if (dup.length) {
      return res.status(409).json({ success: false, message: 'Email or register number already submitted.' });
    }

    const [dupStudent] = await pool.execute(
      'SELECT student_id FROM students WHERE email=? OR register_number=?',
      [email, register_number]
    );
    if (dupStudent.length) {
      return res.status(409).json({ success: false, message: 'Student already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const otp = genOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.execute(
      `INSERT INTO pending_registrations
       (name, register_number, email, password_hash, section, admin_id, otp_code, otp_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, register_number, email, password_hash, section, admin_id, otp, otp_expires]
    );

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

// ── STUDENT LOGIN ─────────────────────────────────────────────
const studentLogin = async (req, res) => {
  try {
    const { email, password, admin_id } = req.body;

    if (!email || !password || !admin_id) {
      return res.status(400).json({ success: false, message: 'Email, password, and Admin ID required.' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE email=? AND admin_id=?',
      [email, admin_id]
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

    if (student.force_password_change) {
      return res.status(403).json({
        success: false,
        message: 'Password change required on first login',
        requiresPasswordChange: true,
        studentId: student.student_id,
      });
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

module.exports = {
  adminRegister,
  verifyOTP,
  resendOTP,
  adminLogin,
  studentSelfRegister,
  studentLogin,
};

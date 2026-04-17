const pool = require('../config/db');
const crypto = require('crypto');

// ── Generate 8-char alphanumeric election code ────────────────
const genCode = () => crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);

// ── Generate or get CAV for an election ───────────────────────
const getOrCreateCAV = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    // Verify election belongs to admin
    const [elec] = await pool.execute(
      'SELECT election_id, election_name, status FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elec.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    // Check existing CAV
    const [existing] = await pool.execute(
      'SELECT * FROM election_cav WHERE election_id=?',
      [election_id]
    );

    if (existing.length) {
      return res.json({ success: true, cav: existing[0], election: elec[0] });
    }

    // Create new CAV
    const code = genCode();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const join_link = `${baseUrl}/join/${code}`;

    await pool.execute(
      'INSERT INTO election_cav (election_id, election_code, join_link) VALUES (?, ?, ?)',
      [election_id, code, join_link]
    );

    const [created] = await pool.execute('SELECT * FROM election_cav WHERE election_id=?', [election_id]);
    res.status(201).json({ success: true, cav: created[0], election: elec[0] });
  } catch (err) {
    console.error('getOrCreateCAV error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Regenerate CAV (new code + link) ─────────────────────────
const regenerateCAV = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elec] = await pool.execute(
      'SELECT election_id FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elec.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const code = genCode();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const join_link = `${baseUrl}/join/${code}`;

    const [existing] = await pool.execute('SELECT cav_id FROM election_cav WHERE election_id=?', [election_id]);

    if (existing.length) {
      await pool.execute(
        'UPDATE election_cav SET election_code=?, join_link=?, is_active=TRUE WHERE election_id=?',
        [code, join_link, election_id]
      );
    } else {
      await pool.execute(
        'INSERT INTO election_cav (election_id, election_code, join_link) VALUES (?, ?, ?)',
        [election_id, code, join_link]
      );
    }

    const [updated] = await pool.execute('SELECT * FROM election_cav WHERE election_id=?', [election_id]);
    res.json({ success: true, cav: updated[0] });
  } catch (err) {
    console.error('regenerateCAV error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Expire CAV when election stops ────────────────────────────
const expireCAV = async (election_id) => {
  try {
    await pool.execute(
      'UPDATE election_cav SET is_active=FALSE, expires_at=NOW() WHERE election_id=?',
      [election_id]
    );
    // Expire all messages for this election too
    await pool.execute(
      'UPDATE election_messages SET expires_at=NOW() WHERE election_id=? AND expires_at IS NULL',
      [election_id]
    );
  } catch (err) {
    console.error('expireCAV error:', err);
  }
};

// ── Public: Resolve code → election info + participant list ───
const resolveCode = async (req, res) => {
  try {
    const { code } = req.params;

    const [cavRows] = await pool.execute(
      `SELECT c.*, e.election_name, e.status, e.semester_tag, e.batch_tag,
              e.final_courses_per_student, e.admin_id, e.field_config,
              a.admin_name, a.college_name
       FROM election_cav c
       JOIN elections e ON c.election_id = e.election_id
       JOIN admins a ON e.admin_id = a.admin_id
       WHERE c.election_code=?`,
      [code]
    );

    if (!cavRows.length) {
      return res.status(404).json({ success: false, message: 'Invalid election code.' });
    }

    const cav = cavRows[0];

    if (!cav.is_active) {
      return res.status(410).json({ success: false, message: 'This election link has expired.', expired: true });
    }

    // Parse field_config — determines which student fields are public on the join page
    // Default: display_name + section public, email + register_number private
    const fieldConfig = cav.field_config
      ? (typeof cav.field_config === 'string' ? JSON.parse(cav.field_config) : cav.field_config)
      : { register_number: 'private', section: 'public', email: 'private' };

    // Get participant list — always show display_name + status + applied_at
    // Conditionally include private fields based on field_config
    const [participants] = await pool.execute(
      `SELECT ep.participant_id, ep.display_name, ep.status, ep.applied_at,
              s.email, s.section, s.register_number
       FROM election_participants ep
       JOIN students s ON ep.student_id = s.student_id
       WHERE ep.election_id=?
       ORDER BY ep.applied_at ASC`,
      [cav.election_id]
    );

    // Filter participant fields for public response
    const publicParticipants = participants.map(p => ({
      participant_id: p.participant_id,
      display_name:   p.display_name,
      status:         p.status,
      applied_at:     p.applied_at,
      // Conditionally exposed based on field_config
      section:          fieldConfig.section         === 'public' ? p.section         : undefined,
      register_number:  fieldConfig.register_number === 'public' ? p.register_number : undefined,
      email:            fieldConfig.email            === 'public' ? p.email           : undefined,
    }));

    res.json({
      success: true,
      election: {
        election_id: cav.election_id,
        election_name: cav.election_name,
        status: cav.status,
        semester_tag: cav.semester_tag,
        batch_tag: cav.batch_tag,
        final_courses_per_student: cav.final_courses_per_student,
        admin_name: cav.admin_name,
        college_name: cav.college_name,
      },
      code: cav.election_code,
      field_config: fieldConfig,   // tells the join page what columns to show
      participants: publicParticipants,
    });
  } catch (err) {
    console.error('resolveCode error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Student: Apply via code (email must match) ────────────────
const applyViaCode = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { code, email } = req.body;

    if (!code || !email) return res.status(400).json({ success: false, message: 'Code and email required.' });

    // Resolve code → election
    const [cavRows] = await pool.execute(
      'SELECT c.election_id, c.is_active, e.status FROM election_cav c JOIN elections e ON c.election_id=e.election_id WHERE c.election_code=?',
      [code]
    );
    if (!cavRows.length) return res.status(404).json({ success: false, message: 'Invalid election code.' });
    const cav = cavRows[0];
    if (!cav.is_active) return res.status(410).json({ success: false, message: 'Election link has expired.' });
    if (cav.status === 'STOPPED') return res.status(400).json({ success: false, message: 'This election is closed.' });

    // Verify student email matches
    const [students] = await pool.execute(
      'SELECT student_id, email, name, section FROM students WHERE student_id=?',
      [student_id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found.' });
    const student = students[0];

    if (student.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Email does not match your account. Identity verification failed.' });
    }

    // Check one-per-election rule
    const [existing] = await pool.execute(
      'SELECT participant_id, status FROM election_participants WHERE student_id=? AND election_id=?',
      [student_id, cav.election_id]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'You have already applied to this election.', existing: existing[0] });
    }

    // Insert participant application
    await pool.execute(
      'INSERT INTO election_participants (election_id, student_id, display_name) VALUES (?, ?, ?)',
      [cav.election_id, student_id, student.name]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted. Awaiting admin confirmation.',
      election_id: cav.election_id,
    });
  } catch (err) {
    console.error('applyViaCode error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: Get participant applications ───────────────────────
const getParticipants = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { election_id } = req.params;

    const [elec] = await pool.execute(
      'SELECT election_id FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elec.length) return res.status(404).json({ success: false, message: 'Election not found.' });

    const [rows] = await pool.execute(
      `SELECT ep.*, s.email, s.name, s.register_number, s.section, s.full_student_id
       FROM election_participants ep
       JOIN students s ON ep.student_id = s.student_id
       WHERE ep.election_id=?
       ORDER BY ep.applied_at ASC`,
      [election_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getParticipants error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Admin: Confirm or reject a participant ────────────────────
const reviewParticipant = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const admin_id = req.user.id;
    const { participant_id } = req.params;
    const { action } = req.body; // 'confirm' or 'reject'

    const [rows] = await conn.execute(
      `SELECT ep.*, s.name, s.email, s.student_id
       FROM election_participants ep
       JOIN students s ON ep.student_id = s.student_id
       JOIN elections e ON ep.election_id = e.election_id
       WHERE ep.participant_id=? AND e.admin_id=?`,
      [participant_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Participant not found.' });

    const p = rows[0];

    // One-per-election check (already applied?) — enforced above on apply
    if (action === 'reject') {
      await conn.execute(
        'UPDATE election_participants SET status=? WHERE participant_id=?',
        ['REJECTED', participant_id]
      );
      // Send rejection message
      await conn.execute(
        `INSERT INTO election_messages (election_id, student_id, message_type, title, body)
         VALUES (?, ?, 'REJECTION', ?, ?)`,
        [p.election_id, p.student_id, 'Application Rejected',
         'Your application for this election was not approved by the admin.']
      );
      return res.json({ success: true, message: 'Participant rejected.' });
    }

    if (action === 'confirm') {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE election_participants SET status=?, confirmed_at=NOW() WHERE participant_id=?',
        ['CONFIRMED', participant_id]
      );

      // Link student to election if not already
      await conn.execute(
        'UPDATE students SET election_id=? WHERE student_id=? AND (election_id IS NULL OR election_id=?)',
        [p.election_id, p.student_id, p.election_id]
      );

      // Send confirmation message (expires when election ends)
      await conn.execute(
        `INSERT INTO election_messages (election_id, student_id, message_type, title, body)
         VALUES (?, ?, 'CONFIRMATION', ?, ?)`,
        [p.election_id, p.student_id, '✅ You are confirmed for the election!',
         `Congratulations ${p.name}! Your participation in election has been confirmed by the admin. The election (course opting) will begin soon. Please update your display name if required.`]
      );

      await conn.commit();
      return res.json({ success: true, message: 'Participant confirmed.' });
    }

    res.status(400).json({ success: false, message: 'Invalid action. Use confirm or reject.' });
  } catch (err) {
    await conn.rollback();
    console.error('reviewParticipant error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ── Student: Update display name ──────────────────────────────
const updateDisplayName = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { election_id, display_name } = req.body;

    if (!display_name || display_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Display name must be at least 2 characters.' });
    }

    const [rows] = await pool.execute(
      'SELECT participant_id, status FROM election_participants WHERE student_id=? AND election_id=?',
      [student_id, election_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'You are not a participant in this election.' });
    if (rows[0].status !== 'CONFIRMED') return res.status(403).json({ success: false, message: 'You must be confirmed before updating your name.' });

    await pool.execute(
      'UPDATE election_participants SET display_name=?, name_updated=TRUE WHERE student_id=? AND election_id=?',
      [display_name.trim(), student_id, election_id]
    );

    res.json({ success: true, message: 'Display name updated.' });
  } catch (err) {
    console.error('updateDisplayName error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Student: Get my messages ──────────────────────────────────
const getMyMessages = async (req, res) => {
  try {
    const student_id = req.user.id;

    const [rows] = await pool.execute(
      `SELECT m.*, e.election_name
       FROM election_messages m
       JOIN elections e ON m.election_id = e.election_id
       WHERE m.student_id=?
         AND (m.expires_at IS NULL OR m.expires_at > NOW())
       ORDER BY m.created_at DESC`,
      [student_id]
    );

    res.json({ success: true, data: rows, unread: rows.filter(m => !m.is_read).length });
  } catch (err) {
    console.error('getMyMessages error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Student: Mark message as read ─────────────────────────────
const markRead = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { message_id } = req.params;

    await pool.execute(
      'UPDATE election_messages SET is_read=TRUE WHERE message_id=? AND student_id=?',
      [message_id, student_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Student: My participant status ────────────────────────────
const getMyParticipation = async (req, res) => {
  try {
    const student_id = req.user.id;

    const [rows] = await pool.execute(
      `SELECT ep.*, e.election_name, e.status AS election_status,
              c.election_code, c.join_link, c.is_active AS cav_active
       FROM election_participants ep
       JOIN elections e ON ep.election_id = e.election_id
       LEFT JOIN election_cav c ON c.election_id = ep.election_id
       WHERE ep.student_id=?
       ORDER BY ep.applied_at DESC`,
      [student_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getMyParticipation error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getOrCreateCAV, regenerateCAV, expireCAV,
  resolveCode, applyViaCode,
  getParticipants, reviewParticipant,
  updateDisplayName,
  getMyMessages, markRead,
  getMyParticipation,
};

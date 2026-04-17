import pool from '../config/db';

// ── STUDENT DASHBOARD ─────────────────────────────────────────
const getStudentDashboard = async (req, res) => {
  try {
    const student_id = req.user.id;

    const [studentRows] = await pool.execute(
      `SELECT s.*, e.status as election_status, e.election_id, e.election_name,
              e.final_courses_per_student, e.window_start, e.window_end
       FROM students s
       LEFT JOIN elections e ON s.election_id = e.election_id
       WHERE s.student_id=?`,
      [student_id]
    );
    if (!studentRows.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const student = studentRows[0];

    // Get tokens with course info
    const [tokens] = await pool.execute(
      `SELECT st.*, c.course_name, c.subject_code, se.seat_code
       FROM student_tokens st
       LEFT JOIN courses c ON st.course_id = c.course_id
       LEFT JOIN seats se ON st.seat_id = se.seat_id
       WHERE st.student_id=? AND st.election_id=?
       ORDER BY st.token_number ASC`,
      [student_id, student.election_id]
    );

    // Get courses with seat counts
    let courses = [];
    if (student.election_id) {
      const [courseRows] = await pool.execute(
        `SELECT c.*,
                (SELECT COUNT(*) FROM seats s2 WHERE s2.course_id=c.course_id AND s2.is_available=FALSE) as booked_count
         FROM courses c
         WHERE c.election_id=? AND c.is_active=TRUE AND c.is_burst=FALSE
         ORDER BY c.course_name ASC`,
        [student.election_id]
      );
      courses = courseRows.map(c => ({
        ...c,
        available_seats: c.total_seats - (c.booked_count || 0),
        is_booked_by_me: tokens.some(t => t.course_id === c.course_id && ['BOOKED','CONFIRMED','AUTO'].includes(t.status)),
      }));
    }

    const confirmedCount = tokens.filter(t => t.status === 'CONFIRMED').length;
    const bookedCount = tokens.filter(t => ['BOOKED','CONFIRMED','AUTO'].includes(t.status)).length;

    res.json({
      success: true,
      student: {
        student_id: student.student_id,
        name: student.name,
        full_student_id: student.full_student_id,
        register_number: student.register_number,
        section: student.section,
        election_id: student.election_id,
        election_name: student.election_name,
        election_status: student.election_status,
        final_courses_per_student: student.final_courses_per_student,
      },
      tokens,
      courses,
      stats: {
        total_tokens: tokens.length,
        booked: bookedCount,
        confirmed: confirmedCount,
        remaining: tokens.length - bookedCount,
      },
    });
  } catch (err) {
    console.error('getStudentDashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── STUDENT BOOKINGS (all tokens with full detail) ────────────
const getStudentBookings = async (req, res) => {
  try {
    const student_id = req.user.id;
    const [rows] = await pool.execute(
      `SELECT st.token_id, st.token_code, st.token_number, st.status,
              st.round_confirmed, st.is_auto_assigned, st.timestamp_booked,
              c.course_id, c.course_name, c.subject_code, c.credit_weight,
              se.seat_code, se.seat_number,
              e.election_name, e.status as election_status
       FROM student_tokens st
       LEFT JOIN courses c ON st.course_id = c.course_id
       LEFT JOIN seats se ON st.seat_id = se.seat_id
       LEFT JOIN elections e ON st.election_id = e.election_id
       WHERE st.student_id=?
       ORDER BY st.token_number ASC`,
      [student_id]
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('getStudentBookings error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── BOOK A SEAT (ATOMIC FCFS) ─────────────────────────────────
const bookSeat = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const student_id = req.user.id;
    const { course_id, election_id } = req.body;

    if (!course_id || !election_id) {
      return res.status(400).json({ success: false, message: 'course_id and election_id required.' });
    }

    await conn.beginTransaction();

    // 1. Check election is ACTIVE and NOT PAUSED
    const [elections] = await conn.execute(
      "SELECT status, is_paused, final_courses_per_student FROM elections WHERE election_id=? FOR SHARE",
      [election_id]
    );
    if (!elections.length || elections[0].status !== 'ACTIVE') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Election is not active. Booking not allowed.' });
    }
    if (elections[0].is_paused) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Election is currently PAUSED by administrator. Please wait.' });
    }

    // 2. Check course exists and is active
    const [courses] = await conn.execute(
      'SELECT * FROM courses WHERE course_id=? AND election_id=? AND is_active=TRUE AND is_burst=FALSE',
      [course_id, election_id]
    );
    if (!courses.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Course not available.' });
    }

    // 3. Check student hasn't already booked this course
    const [existing] = await conn.execute(
      "SELECT token_id FROM student_tokens WHERE student_id=? AND election_id=? AND course_id=? AND status != 'BURST'",
      [student_id, election_id, course_id]
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'You have already booked this course.' });
    }

    // 4. Get next UNUSED token (ascending order — AUTOMATIC)
    const [tokens] = await conn.execute(
      "SELECT * FROM student_tokens WHERE student_id=? AND election_id=? AND status='UNUSED' ORDER BY token_number ASC LIMIT 1 FOR UPDATE",
      [student_id, election_id]
    );
    if (!tokens.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No tokens remaining. You have already selected all courses.' });
    }
    const token = tokens[0];

    // 5. Get next available seat (global FCFS — lowest seat_number)
    const [seats] = await conn.execute(
      'SELECT * FROM seats WHERE election_id=? AND is_available=TRUE ORDER BY seat_number ASC LIMIT 1 FOR UPDATE',
      [election_id]
    );
    if (!seats.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No seats available.' });
    }
    const seat = seats[0];

    // 6. Atomically claim seat
    await conn.execute(
      'UPDATE seats SET is_available=FALSE, course_id=?, student_token_id=?, booked_at=NOW() WHERE seat_id=?',
      [course_id, token.token_id, seat.seat_id]
    );

    // 7. Mark token as BOOKED
    await conn.execute(
      "UPDATE student_tokens SET status='BOOKED', course_id=?, seat_id=?, timestamp_booked=NOW() WHERE token_id=?",
      [course_id, seat.seat_id, token.token_id]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Seat booked successfully!',
      booking: {
        token_code: token.token_code,
        token_number: token.token_number,
        seat_code: seat.seat_code,
        seat_number: seat.seat_number,
        course_id,
        course_name: courses[0].course_name,
        booked_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('bookSeat error:', err);
    res.status(500).json({ success: false, message: 'Server error during booking. Please try again.' });
  } finally {
    conn.release();
  }
};

// ── GET STUDENT RESULTS ───────────────────────────────────────
const getStudentResults = async (req, res) => {
  try {
    const student_id = req.user.id;

    const [rows] = await pool.execute(
      `SELECT st.token_code, st.token_number, st.status, st.round_confirmed, st.is_auto_assigned,
              c.course_name, c.subject_code, c.credit_weight,
              se.seat_code, se.seat_number, st.timestamp_booked
       FROM student_tokens st
       JOIN courses c ON st.course_id = c.course_id
       JOIN seats se ON st.seat_id = se.seat_id
       WHERE st.student_id=? AND st.status IN ('CONFIRMED','AUTO')
       ORDER BY st.token_number ASC`,
      [student_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── STUDENT CHANGE PASSWORD ───────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both passwords required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const bcrypt = (await import('bcryptjs')).default || (await import('bcryptjs'));
    const [rows] = await pool.execute('SELECT password_hash FROM students WHERE student_id=?', [student_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.execute('UPDATE students SET password_hash=? WHERE student_id=?', [hash, student_id]);
    res.json({ success: true, message: 'Password changed.' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { getStudentDashboard, getStudentBookings, bookSeat, getStudentResults, changePassword  };

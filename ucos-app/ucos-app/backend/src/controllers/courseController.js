const pool = require('../config/db');

// ── CREATE COURSE ─────────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const {
      election_id, course_name, subject_code, description,
      total_seats = 126, min_enrollment = 45, max_enrollment = 75,
      classes_per_course = 1, credit_weight = 3.0
    } = req.body;

    if (!election_id || !course_name) {
      return res.status(400).json({ success: false, message: 'election_id and course_name required.' });
    }

    // Verify election belongs to this admin
    const [elections] = await pool.execute(
      'SELECT election_id, status FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (elections[0].status === 'STOPPED') {
      return res.status(400).json({ success: false, message: 'Cannot add courses to a stopped election.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO courses
       (election_id, course_name, subject_code, description, total_seats,
        min_enrollment, max_enrollment, classes_per_course, credit_weight)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [election_id, course_name, subject_code || null, description || null,
       total_seats, min_enrollment, max_enrollment, classes_per_course, credit_weight]
    );

    res.status(201).json({ success: true, message: 'Course created.', course_id: result.insertId });
  } catch (err) {
    console.error('createCourse error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET COURSES ───────────────────────────────────────────────
const getCourses = async (req, res) => {
  try {
    const { election_id } = req.query;
    if (!election_id) return res.status(400).json({ success: false, message: 'election_id required.' });

    const [rows] = await pool.execute(
      `SELECT c.*,
              (SELECT COUNT(*) FROM seats s WHERE s.course_id=c.course_id AND s.is_available=FALSE) as booked_count,
              (SELECT COUNT(*) FROM student_tokens st WHERE st.course_id=c.course_id AND st.status IN ('BOOKED','CONFIRMED','AUTO')) as token_count
       FROM courses c
       WHERE c.election_id=?
       ORDER BY c.course_name ASC`,
      [election_id]
    );

    // Add available seats count
    const enriched = rows.map(c => ({
      ...c,
      available_seats: c.total_seats - (c.booked_count || 0),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('getCourses error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── UPDATE COURSE ─────────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { course_id } = req.params;
    const { course_name, subject_code, description, min_enrollment, max_enrollment, is_active } = req.body;

    const [rows] = await pool.execute(
      `SELECT c.course_id FROM courses c
       JOIN elections e ON c.election_id=e.election_id
       WHERE c.course_id=? AND e.admin_id=?`,
      [course_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Course not found.' });

    await pool.execute(
      `UPDATE courses SET
         course_name=COALESCE(?,course_name),
         subject_code=COALESCE(?,subject_code),
         description=COALESCE(?,description),
         min_enrollment=COALESCE(?,min_enrollment),
         max_enrollment=COALESCE(?,max_enrollment),
         is_active=COALESCE(?,is_active)
       WHERE course_id=?`,
      [course_name, subject_code, description, min_enrollment, max_enrollment,
       is_active !== undefined ? is_active : null, course_id]
    );

    res.json({ success: true, message: 'Course updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE COURSE ─────────────────────────────────────────────
const deleteCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { course_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT c.course_id, e.status FROM courses c
       JOIN elections e ON c.election_id=e.election_id
       WHERE c.course_id=? AND e.admin_id=?`,
      [course_id, admin_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (rows[0].status !== 'NOT_STARTED') {
      return res.status(400).json({ success: false, message: 'Cannot delete course after election started.' });
    }

    await pool.execute('DELETE FROM courses WHERE course_id=?', [course_id]);
    res.json({ success: true, message: 'Course deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { createCourse, getCourses, updateCourse, deleteCourse };

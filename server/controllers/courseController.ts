import pool from '../config/db';

const normalizeLibraryKey = ({ course_name = '', subject_code = '' }) =>
  `${course_name.trim().toLowerCase()}|${subject_code.trim().toUpperCase()}`;

const syncCourseLibraryEntry = async (admin_id, payload) => {
  const course_name = payload.course_name?.trim();
  if (!course_name) return;

  const subject_code = payload.subject_code?.trim() || null;
  const description = payload.description?.trim() || null;
  const batch = payload.batch?.trim() || null;
  const semester = payload.semester?.trim() || null;
  const credit_weight = Number(payload.credit_weight || 3.0).toFixed(1);
  const library_key = normalizeLibraryKey({ course_name, subject_code: subject_code || '' });

  await pool.execute(
    `INSERT INTO course_library
      (admin_id, library_key, course_name, subject_code, description, batch, semester, credit_weight, updated_at)
     VALUES (?,?,?,?,?,?,?,?,NOW())
     ON CONFLICT (admin_id, library_key)
     DO UPDATE SET
       course_name = EXCLUDED.course_name,
       subject_code = EXCLUDED.subject_code,
       description = EXCLUDED.description,
       batch = EXCLUDED.batch,
       semester = EXCLUDED.semester,
       credit_weight = EXCLUDED.credit_weight,
       updated_at = NOW()`,
    [admin_id, library_key, course_name, subject_code, description, batch, semester, credit_weight]
  );
};

const seedCourseLibraryFromHistory = async (admin_id) => {
  const [historyRows] = await pool.execute(
    `SELECT DISTINCT ON (LOWER(TRIM(c.course_name)), UPPER(TRIM(COALESCE(c.subject_code, ''))))
        c.course_name,
        c.subject_code,
        c.description,
        c.batch,
        c.semester,
        c.credit_weight
     FROM courses c
     JOIN elections e ON c.election_id = e.election_id
     WHERE e.admin_id=?
     ORDER BY LOWER(TRIM(c.course_name)), UPPER(TRIM(COALESCE(c.subject_code, ''))), c.created_at DESC`,
    [admin_id]
  );

  for (const row of historyRows) {
    await syncCourseLibraryEntry(admin_id, row);
  }
};

// ── CREATE COURSE ─────────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const {
      election_id, course_name, subject_code, description,
      batch, semester, total_seats = 126, credit_weight, 
      library_course_id = null
    } = req.body;
    
    let resolvedCourse = {
      course_name,
      subject_code,
      description,
      batch,
      semester,
      credit_weight,
    };

    // Verify election belongs to this admin
    const [elections] = await pool.execute(
      'SELECT election_id, status FROM elections WHERE election_id=? AND admin_id=?',
      [election_id, admin_id]
    );
    if (!elections.length) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (elections[0].status === 'STOPPED') {
      return res.status(400).json({ success: false, message: 'Cannot add courses to a stopped election.' });
    }

    if (library_course_id) {
      const [libraryRows] = await pool.execute(
        `SELECT course_name, subject_code, description, batch, semester, credit_weight
         FROM course_library WHERE library_course_id=? AND admin_id=?`,
        [library_course_id, admin_id]
      );
      if (!libraryRows.length) {
        return res.status(404).json({ success: false, message: 'Saved course not found.' });
      }
      resolvedCourse = {
        ...libraryRows[0],
        course_name: course_name ?? libraryRows[0].course_name,
        subject_code: subject_code ?? libraryRows[0].subject_code,
        description: description ?? libraryRows[0].description,
        batch: batch ?? libraryRows[0].batch,
        semester: semester ?? libraryRows[0].semester,
        credit_weight: credit_weight ?? libraryRows[0].credit_weight,
      };
    }

    if (!election_id || !resolvedCourse.course_name?.trim()) {
      return res.status(400).json({ success: false, message: 'election_id and course_name required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO courses
       (election_id, course_name, subject_code, description, batch, semester, total_seats, credit_weight)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        election_id,
        resolvedCourse.course_name.trim(),
        resolvedCourse.subject_code?.trim() || null,
        resolvedCourse.description?.trim() || null,
        resolvedCourse.batch?.trim() || null,
        resolvedCourse.semester?.trim() || null,
        total_seats,
        Number(resolvedCourse.credit_weight) || 3.0,
      ]
    );

    await syncCourseLibraryEntry(admin_id, resolvedCourse);

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

const getCourseLibrary = async (req, res) => {
  try {
    const admin_id = req.user.id;
    // await seedCourseLibraryFromHistory(admin_id); // Optional: run once if migrating

    const [rows] = await pool.execute(
      `SELECT library_course_id, course_name, subject_code, description, batch, semester, credit_weight, updated_at
       FROM course_library
       WHERE admin_id=?
       ORDER BY updated_at DESC, course_name ASC`,
      [admin_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getCourseLibrary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── UPDATE COURSE ─────────────────────────────────────────────
const updateCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { course_id } = req.params;
    const { course_name, subject_code, description, batch, semester, is_active } = req.body;

    const [rows] = await pool.execute(
      `SELECT c.course_id, e.admin_id, c.course_name, c.subject_code, c.description, c.batch, c.semester, c.credit_weight
       FROM courses c
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
         batch=COALESCE(?,batch),
         semester=COALESCE(?,semester),
         is_active=COALESCE(?,is_active)
       WHERE course_id=?`,
      [course_name, subject_code, description, batch, semester,
       is_active !== undefined ? is_active : null, course_id]
    );

    await syncCourseLibraryEntry(rows[0].admin_id, {
      course_name: course_name ?? rows[0].course_name,
      subject_code: subject_code ?? rows[0].subject_code,
      description: description ?? rows[0].description,
      batch: batch ?? rows[0].batch,
      semester: semester ?? rows[0].semester,
      credit_weight: rows[0].credit_weight,
    });

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

const createLibraryCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { course_name, subject_code, description, batch, semester, credit_weight } = req.body;
    if (!course_name) return res.status(400).json({ success: false, message: 'course_name required.' });

    await syncCourseLibraryEntry(admin_id, {
      course_name, subject_code, description, batch, semester, credit_weight
    });
    res.status(201).json({ success: true, message: 'Library course saved.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateLibraryCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { id } = req.params;
    const { course_name, subject_code, description, batch, semester, credit_weight } = req.body;

    await pool.execute(
      `UPDATE course_library SET
         course_name=COALESCE(?,course_name),
         subject_code=COALESCE(?,subject_code),
         description=COALESCE(?,description),
         batch=COALESCE(?,batch),
         semester=COALESCE(?,semester),
         credit_weight=COALESCE(?,credit_weight),
         updated_at=NOW()
       WHERE library_course_id=? AND admin_id=?`,
      [course_name, subject_code, description, batch, semester, credit_weight, id, admin_id]
    );
    res.json({ success: true, message: 'Library course updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteLibraryCourse = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { id } = req.params;
    await pool.execute('DELETE FROM course_library WHERE library_course_id=? AND admin_id=?', [id, admin_id]);
    res.json({ success: true, message: 'Library course deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { createCourse, getCourses, getCourseLibrary, updateCourse, deleteCourse, createLibraryCourse, updateLibraryCourse, deleteLibraryCourse };

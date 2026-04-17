import pool from '../config/db';

const getStudyGroups = async (req, res) => {
  try {
    const { course_id } = req.query;
    if (!course_id) return res.status(400).json({ success: false, message: 'course_id is required.' });

    const [rows] = await pool.execute(
      `SELECT sg.*, 
              GROUP_CONCAT(f.faculty_name) as faculty_names,
              GROUP_CONCAT(f.faculty_id) as faculty_ids
       FROM study_groups sg
       LEFT JOIN study_group_faculty sgf ON sg.group_id = sgf.group_id
       LEFT JOIN faculty f ON sgf.faculty_id = f.faculty_id
       WHERE sg.course_id=?
       GROUP BY sg.group_id`,
      [course_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getStudyGroups error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createStudyGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { course_id, election_id, group_name, capacity, faculty_ids } = req.body;
    if (!course_id || !election_id || !group_name) {
      return res.status(400).json({ success: false, message: 'course_id, election_id, and group_name are required.' });
    }

    await conn.beginTransaction();

    const [result] = await conn.execute(
      'INSERT INTO study_groups (course_id, election_id, group_name, capacity) VALUES (?, ?, ?, ?)',
      [course_id, election_id, group_name, capacity || 45]
    );
    const group_id = result.insertId;

    if (Array.isArray(faculty_ids) && faculty_ids.length) {
      for (const fid of faculty_ids) {
        await conn.execute(
          'INSERT INTO study_group_faculty (group_id, faculty_id) VALUES (?, ?)',
          [group_id, fid]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Study group created.', group_id });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

const updateStudyGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { group_id } = req.params;
    const { group_name, capacity, faculty_ids } = req.body;

    await conn.beginTransaction();

    await conn.execute(
      'UPDATE study_groups SET group_name=?, capacity=? WHERE group_id=?',
      [group_name, capacity, group_id]
    );

    if (Array.isArray(faculty_ids)) {
      await conn.execute('DELETE FROM study_group_faculty WHERE group_id=?', [group_id]);
      for (const fid of faculty_ids) {
        await conn.execute(
          'INSERT INTO study_group_faculty (group_id, faculty_id) VALUES (?, ?)',
          [group_id, fid]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Study group updated.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

const deleteStudyGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { group_id } = req.params;

    await conn.beginTransaction();
    await conn.execute('DELETE FROM study_group_faculty WHERE group_id=?', [group_id]);
    await conn.execute('DELETE FROM study_groups WHERE group_id=?', [group_id]);
    await conn.commit();

    res.json({ success: true, message: 'Study group deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

export { getStudyGroups, createStudyGroup, updateStudyGroup, deleteStudyGroup };

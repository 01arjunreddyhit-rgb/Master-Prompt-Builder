import pool from '../config/db';

const getFaculty = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const [rows] = await pool.execute(
      'SELECT * FROM faculty WHERE admin_id=? ORDER BY faculty_name ASC',
      [admin_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createFaculty = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { faculty_name, email, department } = req.body;
    if (!faculty_name) return res.status(400).json({ success: false, message: 'Faculty name is required.' });

    const [result] = await pool.execute(
      'INSERT INTO faculty (admin_id, faculty_name, email, department) VALUES (?, ?, ?, ?)',
      [admin_id, faculty_name, email || null, department || null]
    );
    res.json({ success: true, message: 'Faculty created.', faculty_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { faculty_id } = req.params;
    const { faculty_name, email, department } = req.body;

    const [rows] = await pool.execute('SELECT faculty_id FROM faculty WHERE faculty_id=? AND admin_id=?', [faculty_id, admin_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    await pool.execute(
      'UPDATE faculty SET faculty_name=?, email=?, department=? WHERE faculty_id=?',
      [faculty_name, email, department, faculty_id]
    );
    res.json({ success: true, message: 'Faculty updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { faculty_id } = req.params;

    const [rows] = await pool.execute('SELECT faculty_id FROM faculty WHERE faculty_id=? AND admin_id=?', [faculty_id, admin_id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    // Check if assigned to any group
    const [assigned] = await pool.execute('SELECT id FROM study_group_faculty WHERE faculty_id=?', [faculty_id]);
    if (assigned.length) {
      return res.status(400).json({ success: false, message: 'Faculty is assigned to a study group and cannot be deleted.' });
    }

    await pool.execute('DELETE FROM faculty WHERE faculty_id=?', [faculty_id]);
    res.json({ success: true, message: 'Faculty deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export { getFaculty, createFaculty, updateFaculty, deleteFaculty };

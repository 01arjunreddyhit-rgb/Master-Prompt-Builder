import pool from '../config/db';

export const getClassRooms = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const [rows] = await pool.execute(
      'SELECT * FROM class_rooms WHERE admin_id = ? ORDER BY room_name ASC',
      [admin_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createClassRoom = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { room_name, room_number_roman, base_capacity } = req.body;
    
    if (!room_name) return res.status(400).json({ success: false, message: 'Room name required.' });

    const [result] = await pool.execute(
      'INSERT INTO class_rooms (admin_id, room_name, room_number_roman, base_capacity, current_capacity) VALUES (?, ?, ?, ?, ?)',
      [admin_id, room_name, room_number_roman || null, base_capacity || 60, base_capacity || 60]
    );
    res.status(201).json({ success: true, message: 'Class room created.', room_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateClassRoom = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { room_id } = req.params;
    const { room_name, room_number_roman, base_capacity } = req.body;

    const [existing] = await pool.execute('SELECT room_id FROM class_rooms WHERE room_id=? AND admin_id=?', [room_id, admin_id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Room not found.' });

    await pool.execute(
      'UPDATE class_rooms SET room_name=?, room_number_roman=?, base_capacity=?, current_capacity=? WHERE room_id=?',
      [room_name, room_number_roman, base_capacity, base_capacity, room_id]
    );
    res.json({ success: true, message: 'Class room updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteClassRoom = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const { room_id } = req.params;

    const [existing] = await pool.execute('SELECT room_id FROM class_rooms WHERE room_id=? AND admin_id=?', [room_id, admin_id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Room not found.' });

    // Check if in use by any tickets
    const [tickets] = await pool.execute('SELECT ticket_id FROM room_tickets WHERE room_id=?', [room_id]);
    if (tickets.length) return res.status(400).json({ success: false, message: 'Room is assigned to a course and cannot be deleted.' });

    await pool.execute('DELETE FROM class_rooms WHERE room_id=?', [room_id]);
    res.json({ success: true, message: 'Class room deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Room Tickets (Linking Course -> Room -> Faculty) ──

export const getRoomTickets = async (req, res) => {
  try {
    const { course_id } = req.query;
    if (!course_id) return res.status(400).json({ success: false, message: 'course_id required.' });

    const [rows] = await pool.execute(
      `SELECT rt.*, cr.room_name, cr.base_capacity, f.faculty_name 
       FROM room_tickets rt
       JOIN class_rooms cr ON rt.room_id = cr.room_id
       LEFT JOIN faculty f ON rt.faculty_id = f.faculty_id
       WHERE rt.course_id = ?
       ORDER BY rt.created_at ASC`,
      [course_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createRoomTicket = async (req, res) => {
  try {
    const { election_id, course_id, room_id, faculty_id, assigned_capacity } = req.body;
    if (!election_id || !course_id || !room_id) {
      return res.status(400).json({ success: false, message: 'election_id, course_id, and room_id required.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO room_tickets (election_id, course_id, room_id, faculty_id, assigned_capacity) VALUES (?, ?, ?, ?, ?)',
      [election_id, course_id, room_id, faculty_id || null, assigned_capacity || null]
    );
    res.status(201).json({ success: true, message: 'Room ticket created.', ticket_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRoomTicket = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    await pool.execute('DELETE FROM room_tickets WHERE ticket_id=?', [ticket_id]);
    res.json({ success: true, message: 'Room ticket removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

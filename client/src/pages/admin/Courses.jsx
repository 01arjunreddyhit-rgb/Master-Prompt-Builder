import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Badge, EmptyState, Spinner, Modal, Card, Button, Input, Select, Alert } from '../../components/ui/index';
import api from '../../services/api';

/* ── Mini seat bar with gradient ─────────────────────────────── */
function SeatFill({ booked, total, min, max }) {
  const pct = total > 0 ? (booked / total) * 100 : 0;
  const atMin  = booked >= min;
  const atMax  = booked >= max;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 5, fontWeight: 700 }}>
        <span style={{ color: 'var(--text-4)' }}>SEATS BOOKED</span>
        <span style={{ color: atMax ? '#DC2626' : atMin ? '#059669' : 'var(--accent)' }}>{booked} / {total}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pct}%`, background: atMax ? '#DC2626' : atMin ? '#059669' : 'var(--accent)', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Room Tickets Modal ─────────────────────────────────────── */
function RoomTicketsModal({ course, election, faculty, onClose }) {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/class_rooms/${course.course_id}`);
      setRooms(data.data || []);
    } catch (err) { setError('Failed to load room tickets.'); }
    finally { setLoading(false); }
  }, [course.course_id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Modal title="Loading Workspace..." onClose={onClose}><Spinner dark /></Modal>;

  return (
    <Modal title={`Room Tickets: ${course.course_name}`} onClose={onClose} size="lg">
      <div style={{ padding: '4px' }}>
        <Alert type="info" style={{ marginBottom: 20 }}>
          Allocate specific classroom tickets and faculty assignments for <b>{course.course_code}</b>.
        </Alert>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {rooms.map(room => (
            <Card key={room.room_id} style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{room.room_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>Faculty ID: {room.faculty_id || 'Not Assigned'}</div>
              <div style={{ marginTop: 12 }}>
                <SeatFill booked={room.current_students || 0} total={room.capacity} min={election.min_class_size} max={election.max_class_size} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminCourses() {
  const { user } = useAuth();
  const { selectedElection } = useElection();
  const navigate = useNavigate();
  const [courses, setCourses]           = useState([]);
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [faculty, setFaculty]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('cards');
  const [showModal, setShowModal]       = useState(false);
  const [editCourse, setEditCourse]     = useState(null);
  const [selectedForRooms, setSelectedForRooms] = useState(null);

  const [form, setForm] = useState({ course_code: '', course_name: '', department: '', faculty_id: '', semester: '', max_seats: 60, is_active: true });
  const [selectedLibraryId, setSelectedLibraryId] = useState('');

  const load = useCallback(async () => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    setLoading(true);
    try {
      const [lr, fr, cr] = await Promise.all([
        api.get('/courses/library'),
        api.get('/faculty'),
        api.get(`/courses?election_id=${selectedElection.election_id}`)
      ]);
      setLibraryCourses(lr.data.data || []);
      setFaculty(fr.data.data || []);
      setCourses(cr.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editCourse) await api.put(`/courses/${editCourse.course_id}`, form);
      else await api.post('/courses', { ...form, election_id: selectedElection.election_id, library_course_id: selectedLibraryId || undefined });
      setShowModal(false); load();
    } catch (err) { alert('Save failed.'); }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/courses/${c.course_id}`, { ...c, is_active: !c.is_active });
      load();
    } catch (err) {}
  };

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Election Courses</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-surface btn-sm" onClick={() => setView(view === 'cards' ? 'table' : 'cards')}>{view === 'cards' ? 'Table View' : 'Card View'}</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditCourse(null); setForm({ course_code: '', course_name: '', department: '', faculty_id: '', semester: '', max_seats: 60, is_active: true }); setShowModal(true); }}>+ Add Course</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : courses.length === 0 ? (
          <EmptyState icon="📚" title="No courses yet" message="Add elective courses for this election."
            action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>Add First Course</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: view === 'cards' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 20 }}>
            {courses.map(c => (
              <Card key={c.course_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Badge variant={c.is_active ? 'green' : 'grey'}>{c.is_active ? 'Active' : 'Hidden'}</Badge>
                  <code style={{ fontSize: '0.7rem' }}>{c.course_code}</code>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{c.course_name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 16 }}>{c.department} &nbsp;·&nbsp; {c.faculty_name || 'No Faculty'}</p>
                
                <div style={{ marginBottom: 20 }}>
                  <SeatFill booked={c.booked_seats || 0} total={c.max_seats} min={selectedElection.min_class_size} max={selectedElection.max_class_size} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="surface" style={{ flex: 1 }} onClick={() => setSelectedForRooms(c)}>Room Tickets</Button>
                  <Button variant="ghost" onClick={() => { setEditCourse(c); setForm(c); setShowModal(true); }}>Edit</Button>
                  <Button variant="ghost" onClick={() => toggleActive(c)}>{c.is_active ? 'Hide' : 'Show'}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showModal && (
          <Modal title={editCourse ? 'Edit Course' : 'Add Course'} onClose={() => setShowModal(false)}>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <Input value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <Input value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Seats</label>
                  <Input type="number" value={form.max_seats} onChange={e => setForm({ ...form, max_seats: parseInt(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <Button variant="primary" type="submit" style={{ flex: 1 }}>Save Course</Button>
                <Button variant="surface" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</Button>
              </div>
            </form>
          </Modal>
        )}

        {selectedForRooms && (
          <RoomTicketsModal course={selectedForRooms} election={selectedElection} faculty={faculty} onClose={() => setSelectedForRooms(null)} />
        )}
      </main>
    </div>
  );
}

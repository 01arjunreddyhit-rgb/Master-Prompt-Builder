import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Badge, EmptyState, Spinner, Modal, Card, Button, Input, Select, Alert } from '../../components/ui/index';
import api from '../../services/api';

/* ── Mini seat bar with gradient ─────────────────────────────── */
function SeatFill({ booked, total }) {
  const pct = total > 0 ? (booked / total) * 100 : 0;
  const isHigh = pct > 90;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 5, fontWeight: 700 }}>
        <span style={{ color: 'var(--text-4)' }}>SEATS BOOKED</span>
        <span style={{ color: isHigh ? '#DC2626' : 'var(--accent)' }}>{booked} / {total}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pct}%`, background: isHigh ? '#DC2626' : 'var(--accent)', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminCourses() {
  const { user } = useAuth();
  const { selectedElection } = useElection();
  const navigate = useNavigate();
  
  const [courses, setCourses]           = useState([]);
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('cards');
  const [showModal, setShowModal]       = useState(false);
  const [editCourse, setEditCourse]     = useState(null);
  const [msg, setMsg]                   = useState(null);

  const [form, setForm] = useState({ 
    subject_code: '', 
    course_name: '', 
    description: '', 
    batch: '', 
    semester: '', 
    total_seats: 126, 
    credit_weight: 3.0,
    is_active: true 
  });
  const [selectedLibraryId, setSelectedLibraryId] = useState('');

  const load = useCallback(async () => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    setLoading(true);
    try {
      const [lr, cr] = await Promise.all([
        api.get('/courses/library'),
        api.get(`/courses?election_id=${selectedElection.election_id}`)
      ]);
      setLibraryCourses(lr.data.data || []);
      setCourses(cr.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleLibrarySelect = (libId) => {
    setSelectedLibraryId(libId);
    if (!libId) return;
    const lib = libraryCourses.find(c => c.library_course_id === parseInt(libId));
    if (lib) {
      setForm({
        ...form,
        subject_code: lib.subject_code || '',
        course_name: lib.course_name || '',
        description: lib.description || '',
        batch: lib.batch || '',
        semester: lib.semester || '',
        credit_weight: lib.credit_weight || 3.0
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editCourse) {
        await api.put(`/courses/${editCourse.course_id}`, form);
        setMsg({ type: 'success', text: 'Course updated.' });
      } else {
        await api.post('/courses', { 
          ...form, 
          election_id: selectedElection.election_id, 
          library_course_id: selectedLibraryId || undefined 
        });
        setMsg({ type: 'success', text: 'Course added to election.' });
      }
      setShowModal(false); 
      load();
    } catch (err) { 
      setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/courses/${c.course_id}`, { is_active: !c.is_active });
      load();
    } catch (err) {}
  };

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div className="page-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Election Courses</h1>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="surface" onClick={() => setView(view === 'cards' ? 'table' : 'cards')}>{view === 'cards' ? 'Table View' : 'Card View'}</Button>
              <Button variant="primary" onClick={() => { 
                setEditCourse(null); 
                setSelectedLibraryId('');
                setForm({ subject_code: '', course_name: '', description: '', batch: '', semester: '', total_seats: 126, credit_weight: 3.0, is_active: true }); 
                setShowModal(true); 
              }}>+ Add Course</Button>
            </div>
          </div>

          {msg && <Alert type={msg.type} onClose={() => setMsg(null)} style={{ marginBottom: 24 }}>{msg.text}</Alert>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
          ) : courses.length === 0 ? (
            <EmptyState icon="📚" title="No courses yet" message="Add elective courses for this election."
              action={<Button variant="primary" onClick={() => setShowModal(true)}>Add First Course</Button>} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: view === 'cards' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr', gap: 20 }}>
              {courses.map(c => (
                <Card key={c.course_id} style={{ borderRadius: 20, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Badge variant={c.is_active ? 'green' : 'grey'}>{c.is_active ? 'Active' : 'Hidden'}</Badge>
                      {c.is_burst && <Badge variant="red">Busted</Badge>}
                    </div>
                    <code style={{ fontSize: '0.7rem', background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>{c.subject_code}</code>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>{c.course_name}</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span>{c.batch || 'All Batches'}</span>
                    <span>·</span>
                    <span>Sem {c.semester || 'N/A'}</span>
                    <span>·</span>
                    <span>{c.credit_weight} Credits</span>
                  </div>
                  
                  <div style={{ marginBottom: 24 }}>
                    <SeatFill booked={c.token_count || 0} total={c.total_seats} />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="surface" size="sm" style={{ flex: 1 }} onClick={() => { setEditCourse(c); setForm(c); setShowModal(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>{c.is_active ? 'Hide' : 'Show'}</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showModal && (
            <Modal title={editCourse ? 'Edit Course' : 'Add Course'} onClose={() => setShowModal(false)} maxWidth="540px">
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {!editCourse && (
                  <div className="form-group">
                    <label className="form-label">Select from Repository (Optional)</label>
                    <Select 
                      value={selectedLibraryId} 
                      onChange={e => handleLibrarySelect(e.target.value)}
                      options={[
                        { value: '', label: '-- Create New / Custom --' },
                        ...libraryCourses.map(lc => ({ value: lc.library_course_id, label: `${lc.course_name} (${lc.subject_code})` }))
                      ]}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input label="Subject Code" value={form.subject_code} onChange={e => setForm({ ...form, subject_code: e.target.value })} required />
                  <Input label="Subject Name" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input label="Batch" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} />
                  <Input label="Semester" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input label="Total Seats" type="number" value={form.total_seats} onChange={e => setForm({ ...form, total_seats: parseInt(e.target.value) })} />
                  <Input label="Credits" type="number" step="0.5" value={form.credit_weight} onChange={e => setForm({ ...form, credit_weight: parseFloat(e.target.value) })} />
                </div>

                <textarea 
                  placeholder="Description..." 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <Button variant="primary" type="submit" style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 700 }}>{editCourse ? 'Update Course' : 'Add to Election'}</Button>
                  <Button variant="surface" onClick={() => setShowModal(false)} style={{ flex: 1, height: 48, borderRadius: 12 }}>Cancel</Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      </main>
    </div>
  );
}

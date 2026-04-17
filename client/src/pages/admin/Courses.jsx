import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Badge, EmptyState, Spinner, Modal } from '../../components/ui/index';
import api from '../../services/api';

/* ── Mini seat bar with gradient ────────────────────────────── */
function SeatFill({ booked, total, min, max }) {
  const pct = total > 0 ? (booked / total) * 100 : 0;
  const atMin  = booked >= min;
  const atMax  = booked >= max;
  const color  = atMax ? '#DC2626' : atMin ? '#059669' : '#4F46E5';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
        <span style={{ color: 'var(--text-4)' }}>{booked} booked</span>
        <span style={{ color, fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease', boxShadow: `0 0 6px ${color}44` }} />
        {/* Min marker */}
        {total > 0 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(min / total) * 100}%`, width: 2, background: 'rgba(0,0,0,0.25)', borderRadius: 1 }} title={`Min: ${min}`} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-4)' }}>
        <span>0</span><span title="min" style={{ color: '#D97706' }}>▲{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

/* ── Course card view ───────────────────────────────────────── */
function CourseCard({ c, i, onEdit, onDelete, onToggle, onToggleRooms }) {
  const [hover, setHover] = useState(false);
  const booked = c.token_count || 0;
  const total  = c.total_seats || c.max_enrollment || 0;
  const color  = c.is_burst ? '#DC2626' : !c.is_active ? '#94A3B8' : '#059669';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)', borderRadius: 18, padding: '20px 22px',
        border: `1.5px solid ${hover ? color : 'var(--border)'}`,
        boxShadow: hover ? `0 8px 28px ${color}18` : 'var(--shadow-sm)',
        transition: 'all 0.2s', opacity: !c.is_active && !c.is_burst ? 0.7 : 1,
        position: 'relative', overflow: 'hidden',
      }}>
      {/* top color strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '18px 18px 0 0' }} />
      {/* index badge */}
      <div style={{ position: 'absolute', top: 14, right: 16, width: 26, height: 26, borderRadius: '50%', background: 'var(--muted-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)' }}>#{i + 1}</div>

      {/* Code + name */}
      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 5, fontFamily: 'var(--mono)' }}>{c.subject_code || 'NO-CODE'}</div>
      <div style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text)', marginBottom: 4, lineHeight: 1.35, paddingRight: 32 }}>{c.course_name}</div>
      {c.description && <div style={{ fontSize: '0.76rem', color: 'var(--text-4)', marginBottom: 12, lineHeight: 1.4 }}>{c.description}</div>}

      {/* Seat fill */}
      <div style={{ marginBottom: 14 }}>
        <SeatFill booked={booked} total={total} min={c.min_enrollment} max={c.max_enrollment} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6, background: 'var(--muted-bg)', color: 'var(--text-3)', fontWeight: 600 }}>{c.credit_weight} cr</span>
          {c.is_burst ? <Badge variant="red">Burst</Badge> : c.is_active ? <Badge variant="green">Active</Badge> : <Badge variant="grey">Inactive</Badge>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-surface btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => onToggleRooms(c)}>Rooms</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => onEdit(c)}>Edit</button>
          {!c.is_burst && (
            <button className={`btn btn-sm ${c.is_active ? 'btn-warning' : 'btn-success'}`} style={{ fontSize: '0.75rem' }} onClick={() => onToggle(c)}>
              {c.is_active ? 'Pause' : 'Activate'}
            </button>
          )}
          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => onDelete(c)}>✕</button>
        </div>
      </div>
    </div>
  );
}

/* ── Aggregate chart bar across all courses ─────────────────── */
function CourseHeatRow({ courses = [] }) {
  if (!courses.length) return null;
  const max = Math.max(...courses.map(c => c.max_enrollment || 1), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {courses.map((c, i) => {
        const booked = c.token_count || 0;
        const pct = (booked / max) * 100;
        const minPct = (c.min_enrollment / max) * 100;
        const maxPct = (c.max_enrollment / max) * 100;
        const color = booked >= c.max_enrollment ? '#DC2626' : booked >= c.min_enrollment ? '#059669' : '#4F46E5';
        return (
          <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 120, fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={c.course_name}>
              {c.subject_code || c.course_name.split(' ')[0]}
            </div>
            <div style={{ flex: 1, height: 20, background: 'var(--muted-bg)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
              {/* Max capacity zone */}
              <div style={{ position: 'absolute', left: `${minPct}%`, width: `${maxPct - minPct}%`, top: 0, bottom: 0, background: '#E2E8F0', borderRadius: 2 }} />
              {/* Booked fill */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 6, transition: `width 0.7s ease ${i * 0.05}s`, boxShadow: `0 0 8px ${color}44` }}>
                {pct > 12 && <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: 'white', fontWeight: 700 }}>{booked}</span>}
              </div>
            </div>
            <div style={{ width: 32, fontSize: '0.68rem', color, fontWeight: 700, fontFamily: 'var(--mono)', textAlign: 'right' }}>{booked}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Room Tickets Modal ────────────────────────────────────── */
function RoomTicketsModal({ course, election, faculty, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [classRooms, setClassRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_id: '', assigned_capacity: '', faculty_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [tr, cr] = await Promise.all([
        api.get(`/room-tickets?course_id=${course.course_id}`),
        api.get('/class-rooms')
      ]);
      setTickets(tr.data.data || []);
      setClassRooms(cr.data.data || []);
    } catch (err) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [course.course_id]);

  const handleAdd = async () => {
    if (!form.room_id) return alert('Please select a Class Room.');
    try {
      await api.post('/room-tickets', { ...form, course_id: course.course_id, election_id: election.election_id });
      setShowAdd(false);
      setForm({ room_id: '', assigned_capacity: '', faculty_id: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Add failed.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this room assignment?')) return;
    try {
      await api.delete(`/room-tickets/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
  };

  return (
    <Modal title={`Room Assignments: ${course.course_name}`} onClose={onClose} maxWidth={540}>
      {loading ? <div style={{textAlign:'center', padding:40}}><Spinner dark /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tickets.length === 0 && !showAdd && (
             <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: '0.85rem' }}>No rooms assigned. This course has no physical location limits yet.</div>
          )}
          {tickets.map(t => (
            <div key={t.ticket_id} style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{t.room_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>(Max: {t.base_capacity})</span></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-4)', marginTop: 4 }}>
                   Assigned Cap: <strong style={{ color: 'var(--text-2)' }}>{t.assigned_capacity || t.base_capacity}</strong> · Faculty: <strong style={{ color: 'var(--text-2)' }}>{t.faculty_name || 'Unassigned'}</strong>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.ticket_id)}>✕</button>
            </div>
          ))}
          
          {!showAdd ? (
            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowAdd(true)}>+ Assign Room</button>
          ) : (
            <div style={{ padding: 16, border: '1.5px dashed var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Class Room</label>
                <select className="form-select" value={form.room_id} onChange={e => {
                  const rm = classRooms.find(r => r.room_id == e.target.value);
                  setForm({...form, room_id: e.target.value, assigned_capacity: rm ? rm.base_capacity : ''});
                }}>
                  <option value="">-- Choose Room --</option>
                  {classRooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name} (Cap: {r.base_capacity})</option>)}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assigned Capacity</label>
                  <input className="form-input" type="number" placeholder="Optional" value={form.assigned_capacity} onChange={e => setForm({...form, assigned_capacity: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assign Faculty</label>
                  <select className="form-select" value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {faculty.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleAdd}>Assign Room</button>
                <button className="btn btn-surface btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminCourses() {
  const [courses, setCourses]           = useState([]);
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [faculty, setFaculty]           = useState([]);
  const [activeElection, setActive]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editCourse, setEditCourse]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [view, setView]                 = useState('cards'); // 'cards' | 'table'
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [selectedForRooms, setSelectedForRooms] = useState(null);
  const [form, setForm]                 = useState({ course_name: '', subject_code: '', description: '', min_enrollment: 45, max_enrollment: 75, classes_per_course: 1, credit_weight: 3.0 });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = async () => {
    setLoading(true);
    try {
      const er = await api.get('/elections');
      const elecs = er.data.data || [];
      const active = elecs.find(e => ['NOT_STARTED','ACTIVE','PAUSED'].includes(e.status));
      setActive(active || null);
      
      const [lr, fr] = await Promise.all([
        api.get('/courses/library'),
        api.get('/faculty')
      ]);
      setLibraryCourses(lr.data.data || []);
      setFaculty(fr.data.data || []);

      if (active) {
        const cr = await api.get(`/courses?election_id=${active.election_id}`);
        setCourses(cr.data.data || []);
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openAdd  = () => {
    setEditCourse(null);
    setSelectedLibraryId('');
    setForm({ course_name: '', subject_code: '', description: '', min_enrollment: 45, max_enrollment: 75, classes_per_course: 1, credit_weight: 3.0 });
    setShowModal(true);
  };
  const openEdit = c  => {
    setEditCourse(c);
    setSelectedLibraryId('');
    setForm({ course_name: c.course_name, subject_code: c.subject_code||'', description: c.description||'', min_enrollment: c.min_enrollment, max_enrollment: c.max_enrollment, classes_per_course: c.classes_per_course, credit_weight: c.credit_weight });
    setShowModal(true);
  };

  const loadLibraryCourse = (libraryId) => {
    setSelectedLibraryId(libraryId);
    const saved = libraryCourses.find((entry) => String(entry.library_course_id) === String(libraryId));
    if (!saved) return;
    setForm({
      course_name: saved.course_name || '',
      subject_code: saved.subject_code || '',
      description: saved.description || '',
      min_enrollment: saved.min_enrollment ?? 45,
      max_enrollment: saved.max_enrollment ?? 75,
      classes_per_course: saved.classes_per_course ?? 1,
      credit_weight: saved.credit_weight ?? 3.0,
    });
  };

  const handleSave = async () => {
    if (!form.course_name.trim()) return alert('Course name required.');
    setSaving(true);
    try {
      if (editCourse) await api.put(`/courses/${editCourse.course_id}`, form);
      else await api.post('/courses', {
        ...form,
        election_id: activeElection.election_id,
        library_course_id: selectedLibraryId || undefined,
      });
      setShowModal(false); load();
    } catch (err) { alert(err.response?.data?.message || 'Save failed.'); }
    setSaving(false);
  };

  const handleDelete = async c => {
    if (!window.confirm(`Delete "${c.course_name}"?`)) return;
    try { await api.delete(`/courses/${c.course_id}`); load(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
  };

  const toggleActive = async c => {
    await api.put(`/courses/${c.course_id}`, { is_active: !c.is_active }); load();
  };

  const active  = courses.filter(c => c.is_active && !c.is_burst).length;
  const burst   = courses.filter(c => c.is_burst).length;
  const totalBooked = courses.reduce((s, c) => s + (c.token_count || 0), 0);
  const totalSeats  = courses.reduce((s, c) => s + (c.max_enrollment || 0), 0);

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Courses</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>{activeElection ? `Election: ${activeElection.election_name}` : 'No active election'}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--muted-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
              {['cards', 'table'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.75rem', fontWeight: 600, background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-4)', boxShadow: view === v ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}>
                  {v === 'cards' ? '⊞ Cards' : '≡ Table'}
                </button>
              ))}
            </div>
            {!!libraryCourses.length && (
              <Badge variant="blue">{libraryCourses.length} saved</Badge>
            )}
            {activeElection && <button className="btn btn-primary" onClick={openAdd}>+ Add Course</button>}
          </div>
        </div>

        {!activeElection && !loading && (
          <div className="alert alert-warning">No active election. Create one in <strong>Election Control</strong> first.</div>
        )}

        {/* ── Summary KPIs ── */}
        {courses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Courses', v: courses.length, color: '#4F46E5' },
              { label: 'Active',        v: active,         color: '#059669' },
              { label: 'Burst',         v: burst,          color: '#DC2626' },
              { label: 'Total Booked',  v: totalBooked,    color: '#D97706' },
              { label: 'Total Seats',   v: totalSeats,     color: '#7C3AED' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '14px 14px 0 0' }} />
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Aggregate demand chart ── */}
        {courses.length > 1 && (
          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>Enrollment Demand</div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem' }}>
                {[['#4F46E5','Demand'],['#059669','≥ Min'],['#DC2626','≥ Max'],['#E2E8F0','Target zone']].map(([c,l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-3)' }}>{l}</span>
                  </span>
                ))}
              </div>
            </div>
            <CourseHeatRow courses={courses} />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : courses.length === 0 && activeElection ? (
          <EmptyState icon="📚" title="No courses yet" message="Add elective courses for this election."
            action={<button className="btn btn-primary" onClick={openAdd}>Add First Course</button>} />
        ) : view === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 18 }}>
            {courses.map((c, i) => <CourseCard key={c.course_id} c={c} i={i} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} onToggleRooms={setSelectedForRooms} />)}
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{courses.length} Courses</span>
              <Badge variant="blue">{active} active</Badge>
            </div>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead><tr><th>#</th><th>Course</th><th>Code</th><th>Credits</th><th>Min/Max</th><th style={{ minWidth: 180 }}>Demand</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={c.course_id}>
                      <td style={{ color: 'var(--text-4)' }}>{i+1}</td>
                      <td><strong style={{ color: 'var(--text)' }}>{c.course_name}</strong>{c.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 2 }}>{c.description}</div>}</td>
                      <td><span className="code-chip">{c.subject_code||'—'}</span></td>
                      <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{c.credit_weight}</span></td>
                      <td><span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-3)' }}>{c.min_enrollment}/{c.max_enrollment}</span></td>
                      <td><SeatFill booked={c.token_count||0} total={c.max_enrollment} min={c.min_enrollment} max={c.max_enrollment} /></td>
                      <td>{c.is_burst ? <Badge variant="red">Burst</Badge> : c.is_active ? <Badge variant="green">Active</Badge> : <Badge variant="grey">Inactive</Badge>}</td>
                      <td><div style={{ display: 'flex', gap: 5 }}><button className="btn btn-surface btn-sm" onClick={() => setSelectedForRooms(c)}>Rooms</button><button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>{!c.is_burst && <button className={`btn btn-sm ${c.is_active?'btn-warning':'btn-success'}`} onClick={() => toggleActive(c)}>{c.is_active?'Pause':'On'}</button>}<button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>✕</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Add/Edit Modal ── */}
        {showModal && (
          <Modal title={editCourse ? 'Edit Course' : 'Add New Course'} onClose={() => setShowModal(false)}
            footer={<><button className="btn btn-surface btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : editCourse ? 'Save Changes' : 'Add Course'}</button></>}>
            {!editCourse && !!libraryCourses.length && (
              <div className="form-group">
                <label className="form-label">Load From Saved Courses</label>
                <select className="form-select" value={selectedLibraryId} onChange={(e) => loadLibraryCourse(e.target.value)}>
                  <option value="">Start from blank course</option>
                  {libraryCourses.map((entry) => (
                    <option key={entry.library_course_id} value={entry.library_course_id}>
                      {entry.subject_code ? `${entry.subject_code} - ${entry.course_name}` : entry.course_name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                  Saved courses come from your earlier elections and any course you create or edit here.
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Course Name *</label>
              <input className="form-input" placeholder="Machine Learning" value={form.course_name} onChange={set('course_name')} />
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Subject Code</label><input className="form-input" placeholder="ML301" value={form.subject_code} onChange={set('subject_code')} /></div>
              <div className="form-group"><label className="form-label">Credits</label><input className="form-input" type="number" step="0.5" value={form.credit_weight} onChange={set('credit_weight')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Min Enrollment: {form.min_enrollment}</label>
                <input type="range" min="0" max="150" value={form.min_enrollment} onChange={set('min_enrollment')} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Enrollment: {form.max_enrollment}</label>
                <input type="range" min="0" max="300" value={form.max_enrollment} onChange={set('max_enrollment')} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
            </div>
            {/* Live preview bar */}
            {(form.min_enrollment || form.max_enrollment) && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--muted-bg)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>Capacity preview</div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, width: `${(parseInt(form.min_enrollment)||0) / Math.max(parseInt(form.max_enrollment)||1, 1) * 100}%`, top: 0, bottom: 0, background: '#4F46E5', borderRadius: 99 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-4)', marginTop: 4 }}>
                  <span>Min: {form.min_enrollment}</span><span>Max: {form.max_enrollment}</span>
                </div>
              </div>
            )}
            <div className="form-group"><label className="form-label">Description (optional)</label><textarea className="form-textarea" rows={2} placeholder="Brief description..." value={form.description} onChange={set('description')} /></div>
          </Modal>
        )}
        {selectedForRooms && (
          <RoomTicketsModal course={selectedForRooms} election={activeElection} faculty={faculty} onClose={() => setSelectedForRooms(null)} />
        )}
      </main>
    </div>
  );
}

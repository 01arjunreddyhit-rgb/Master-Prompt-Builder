import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Alert, Spinner, Modal, ProgressBar } from '../../components/ui/index';
import api from '../../services/api';

/* ── Copy button ─────────────────────────────────────────────── */
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: copied ? '#ECFDF5' : 'var(--surface)', color: copied ? '#059669' : 'var(--text-3)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
      {copied ? '✓ Copied' : `⎘ ${label}`}
    </button>
  );
}

/* ── Inline CAV card ─────────────────────────────────────────── */
function CAVCard({ electionId }) {
  const [cav, setCav] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  const load = useCallback(() => {
    if (!electionId) return;
    api.get(`/cav/${electionId}`)
      .then(r => setCav(r.data.cav))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [electionId]);

  useEffect(() => { load(); }, [load]);

  const handleRegen = async () => {
    if (!window.confirm('Regenerate code? The old link will stop working immediately.')) return;
    setRegen(true);
    await api.post(`/cav/${electionId}/regenerate`).catch(() => {});
    load();
    setRegen(false);
  };

  if (loading) return <div style={{ padding: '16px 0', textAlign: 'center' }}><Spinner dark /></div>;
  if (!cav) return null;

  return (
    <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1a1f35 100%)', borderRadius: 16, padding: '22px 26px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(79,70,229,0.3)' }}>
      {/* grid bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 5 }}>Election Code (CAV)</div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '0.12em', color: '#818CF8' }}>{cav.election_code}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 99, background: cav.is_active ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.15)', border: `1px solid ${cav.is_active ? 'rgba(5,150,105,0.4)' : 'rgba(220,38,38,0.3)'}`, color: cav.is_active ? '#34D399' : '#FCA5A5', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {cav.is_active ? 'Active' : 'Expired'}
          </span>
        </div>

        {/* Link row */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cav.join_link}</span>
          <CopyBtn text={cav.join_link} label="Link" />
          <CopyBtn text={cav.election_code} label="Code" />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleRegen} disabled={regen}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {regen ? <Spinner /> : '↻'} Regenerate
          </button>
          <a href={cav.join_link} target="_blank" rel="noreferrer"
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.5)', background: 'rgba(79,70,229,0.15)', color: '#818CF8', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            ↗ Preview Page
          </a>
          <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>
            Share this code or link with participants
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Checklist item ──────────────────────────────────────────── */
function CheckItem({ ok, label, count, expected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: ok ? '#ECFDF5' : 'var(--muted-bg)', border: `2px solid ${ok ? '#059669' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '0.7rem', color: ok ? '#059669' : 'var(--text-4)', fontWeight: 800 }}>{ok ? '✓' : '·'}</span>
      </div>
      <span style={{ flex: 1, fontSize: '0.85rem', color: ok ? 'var(--text)' : 'var(--text-3)', fontWeight: ok ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', fontWeight: 700, color: ok ? '#059669' : 'var(--text-4)' }}>
        {count}{expected !== undefined ? ` / ${expected}` : ''}
      </span>
    </div>
  );
}

/* ── Visibility toggle ───────────────────────────────────────── */
function VisibilityToggle({ value, onChange, label }) {
  const isPublic = value === 'public';
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight:600, fontSize:'0.83rem', color:'var(--text)' }}>{label}</div>
        <div style={{ fontSize:'0.7rem', color:'var(--text-4)', marginTop:1 }}>
          {isPublic ? 'Visible to all participants on the join page' : 'Hidden — only admin can see this'}
        </div>
      </div>
      <button onClick={() => onChange(isPublic ? 'private' : 'public')}
        style={{ padding:'5px 14px', borderRadius:99, border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.73rem', fontWeight:700, background:isPublic?'#ECFDF5':'var(--muted-bg)', color:isPublic?'#059669':'var(--text-4)', transition:'all 0.15s', flexShrink:0, marginLeft:16 }}>
        {isPublic ? '🌐 Public' : '🔒 Private'}
      </button>
    </div>
  );
}

/* ── Election form fields ────────────────────────────────────── */
function ElectionFormFields({ form, setF, setForm }) {
  const fc = form.field_config || { register_number:'private', section:'public', email:'private' };
  const setFc = (key, val) => setForm(f => ({ ...f, field_config: { ...fc, [key]: val } }));

  return (
    <>
      <div className="form-group">
        <label className="form-label">Election Name *</label>
        <input className="form-input" placeholder="6th Semester Elective Allocation 2026"
          value={form.election_name} onChange={setF('election_name')} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Semester Tag</label>
          <input className="form-input" placeholder="6th Sem" value={form.semester_tag} onChange={setF('semester_tag')} />
        </div>
        <div className="form-group">
          <label className="form-label">Batch Tag</label>
          <input className="form-input" placeholder="2023–2027" value={form.batch_tag} onChange={setF('batch_tag')} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Courses / Student</label>
          <input className="form-input" type="number" min="1" value={form.final_courses_per_student} onChange={setF('final_courses_per_student')} />
        </div>
        <div className="form-group">
          <label className="form-label">Faculty Count</label>
          <input className="form-input" type="number" min="1" value={form.faculty_count} onChange={setF('faculty_count')} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Min Class Size</label>
          <input className="form-input" type="number" value={form.min_class_size} onChange={setF('min_class_size')} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Class Size</label>
          <input className="form-input" type="number" value={form.max_class_size} onChange={setF('max_class_size')} />
        </div>
      </div>

      {/* Participant field visibility */}
      <div style={{ marginTop:8, padding:'14px 16px', background:'var(--muted-bg)', borderRadius:14, border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text)', marginBottom:4 }}>
          Join Page — Participant Field Visibility
        </div>
        <div style={{ fontSize:'0.74rem', color:'var(--text-4)', marginBottom:12, lineHeight:1.5 }}>
          Control which fields are visible to other participants on the public join page. Display name is always shown.
        </div>
        <VisibilityToggle label="Register Number" value={fc.register_number} onChange={v => setFc('register_number', v)} />
        <VisibilityToggle label="Section"         value={fc.section}         onChange={v => setFc('section', v)} />
        <VisibilityToggle label="Email"           value={fc.email}           onChange={v => setFc('email', v)} />
      </div>
    </>
  );
}

const BLANK_FORM = { election_name: '', semester_tag: '', batch_tag: '', final_courses_per_student: 2, faculty_count: 4, min_class_size: 45, max_class_size: 75, field_config: { register_number:'private', section:'public', email:'private' } };

/* ── Main ──────────────────────────────────────────────────── */
export default function ElectionControl() {
  const [elections, setElections] = useState([]);
  const [current, setCurrent]     = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showStop, setShowStop]   = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [msg, setMsg]             = useState(null);
  const [form, setFormState]      = useState(BLANK_FORM);
  const setF = k => e => setFormState(f => ({ ...f, [k]: e.target.value }));

  const loadElections = useCallback(() => {
    api.get('/elections').then(r => {
      const list = r.data.data || [];
      setElections(list);
      const active = list.find(e => ['NOT_STARTED','ACTIVE','PAUSED'].includes(e.status));
      setCurrent(active || null);
    });
  }, []);

  const loadStatus = useCallback((id) => {
    api.get(`/elections/${id}/status`).then(r => setStatus(r.data.data)).catch(() => {});
    api.get(`/elections/${id}/checklist`).then(r => setChecklist(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadElections(); }, [loadElections]);
  useEffect(() => {
    if (current?.election_id) {
      loadStatus(current.election_id);
      const iv = setInterval(() => loadStatus(current.election_id), 10000);
      return () => clearInterval(iv);
    }
  }, [current?.election_id, loadStatus]);

  const action = async (type) => {
    if (!current) return;
    setActionLoading(type); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${current.election_id}/${type}`);
      setMsg({ type: 'success', text: data.message });
      loadElections(); loadStatus(current.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally { setActionLoading(''); }
  };

  const handleStop = async () => {
    setShowStop(false); setActionLoading('stop'); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${current.election_id}/stop`);
      setMsg({ type: 'success', text: data.message });
      loadElections(); loadStatus(current.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Stop failed.' });
    } finally { setActionLoading(''); }
  };

  const parseForm = f => ({ ...f, final_courses_per_student: parseInt(f.final_courses_per_student), faculty_count: parseInt(f.faculty_count), min_class_size: parseInt(f.min_class_size), max_class_size: parseInt(f.max_class_size) });

  const handleCreate = async () => {
    if (!form.election_name.trim()) return setMsg({ type: 'error', text: 'Election name required.' });
    setLoading(true); setMsg(null);
    try {
      await api.post('/elections', parseForm(form));
      setMsg({ type: 'success', text: 'Election created! A join code has been generated automatically. Now add courses and upload students.' });
      setShowCreate(false); setFormState(BLANK_FORM); loadElections();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Create failed.' }); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!form.election_name.trim()) return setMsg({ type: 'error', text: 'Election name required.' });
    setLoading(true); setMsg(null);
    try {
      await api.put(`/elections/${current.election_id}`, parseForm(form));
      setMsg({ type: 'success', text: 'Election updated.' });
      setShowEdit(false); loadElections();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' }); }
    finally { setLoading(false); }
  };

  const past = elections.filter(e => e.status === 'STOPPED');

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Election Control</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Manage the full election lifecycle</p>
          </div>
          {!current && <button className="btn btn-primary" onClick={() => { setFormState(BLANK_FORM); setShowCreate(true); }}>+ New Election</button>}
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {/* ── No current election ── */}
        {!current ? (
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '64px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🗳️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', marginBottom: 8 }}>No Active Election</h3>
            <p style={{ color: 'var(--text-3)', marginBottom: 28, maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Create an election to begin UCOS. A shareable join code is auto-generated — share it with participants so they can apply.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => { setFormState(BLANK_FORM); setShowCreate(true); }}>Create Election →</button>
          </div>
        ) : (
          <>
            {/* ── Election header card ── */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '-0.4px', marginBottom: 8 }}>{current.election_name}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <StatusPill status={current.status} />
                    {current.semester_tag && <span className="badge badge-blue">{current.semester_tag}</span>}
                    {current.batch_tag && <span className="badge badge-grey">{current.batch_tag}</span>}
                    <span className="badge badge-grey">ID #{current.election_id}</span>
                    <span className="badge badge-green">{current.final_courses_per_student} courses/student</span>
                  </div>
                </div>
                {current.status === 'NOT_STARTED' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setFormState({ election_name: current.election_name, semester_tag: current.semester_tag || '', batch_tag: current.batch_tag || '', final_courses_per_student: current.final_courses_per_student, faculty_count: current.faculty_count, min_class_size: current.min_class_size, max_class_size: current.max_class_size, field_config: current.field_config ? (typeof current.field_config === 'string' ? JSON.parse(current.field_config) : current.field_config) : { register_number:'private', section:'public', email:'private' } });
                    setShowEdit(true);
                  }}>✏ Edit</button>
                )}
              </div>

              {/* Live stats */}
              {status && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                  {[
                    { label: 'Students', v: status.total_students || 0, color: '#4F46E5' },
                    { label: 'Courses', v: status.active_courses || 0, color: '#059669' },
                    { label: 'Bookings', v: status.total_bookings || 0, color: '#D97706' },
                    { label: 'Confirmed', v: status.students_confirmed || 0, color: '#7C3AED' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--muted-bg)', borderRadius: 12, padding: '12px 16px', borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {status && status.total_students > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Booking Progress</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{status.students_started || 0} / {status.total_students} students</span>
                  </div>
                  <ProgressBar value={status.students_started || 0} max={status.total_students} green />
                </div>
              )}
            </div>

            {/* ── CAV card ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 12 }}>
                Join Code &amp; Link <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>Share with participants so they can apply</span>
              </div>
              <CAVCard electionId={current.election_id} />
            </div>

            {/* ── Checklist + Controls ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              {/* Checklist */}
              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 16 }}>Pre-Start Checklist</div>
                {checklist ? (
                  <>
                    <CheckItem ok={checklist.checklist.students.ok} label="Students registered" count={checklist.checklist.students.count} />
                    <CheckItem ok={checklist.checklist.courses.ok} label="Courses created" count={checklist.checklist.courses.count} />
                    <CheckItem ok={checklist.checklist.tokens.ok} label="Tokens generated" count={checklist.checklist.tokens.count} expected={checklist.checklist.tokens.expected} />
                    <CheckItem ok={checklist.checklist.seats.ok} label="Seats initialised" count={checklist.checklist.seats.count} expected={checklist.checklist.seats.expected} />

                    {(!checklist.checklist.tokens.ok || !checklist.checklist.seats.ok) && checklist.checklist.students.ok && checklist.checklist.courses.ok && (
                      <button className="btn btn-warning btn-full" style={{ marginTop: 18 }}
                        onClick={() => action('init')} disabled={actionLoading === 'init'}>
                        {actionLoading === 'init' ? <Spinner /> : '⚙ Initialise Tokens & Seats'}
                      </button>
                    )}

                    {checklist.allReady && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>
                        ✅ All checks passed — ready to start
                      </div>
                    )}
                  </>
                ) : <div style={{ textAlign: 'center', padding: 24 }}><Spinner dark /></div>}
              </div>

              {/* Controls */}
              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 16 }}>Election Controls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {current.status === 'NOT_STARTED' && (
                    <button className="btn btn-success btn-full"
                      onClick={() => action('start')}
                      disabled={!checklist?.allReady || !!actionLoading}
                      style={{ padding: '14px', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                      {actionLoading === 'start' ? <Spinner /> : '▶  START ELECTION'}
                    </button>
                  )}

                  {current.status === 'ACTIVE' && (
                    <>
                      <button className="btn btn-warning btn-full" onClick={() => action('pause')} disabled={!!actionLoading}>
                        {actionLoading === 'pause' ? <Spinner /> : '⏸  PAUSE ELECTION'}
                      </button>
                      <button className="btn btn-danger btn-full" onClick={() => setShowStop(true)} disabled={!!actionLoading}>
                        ⏹  STOP ELECTION
                      </button>
                    </>
                  )}

                  {current.status === 'PAUSED' && (
                    <>
                      <button className="btn btn-success btn-full" onClick={() => action('resume')} disabled={!!actionLoading}>
                        {actionLoading === 'resume' ? <Spinner /> : '▶  RESUME ELECTION'}
                      </button>
                      <button className="btn btn-danger btn-full" onClick={() => setShowStop(true)} disabled={!!actionLoading}>
                        ⏹  STOP ELECTION
                      </button>
                    </>
                  )}

                  {current.status === 'STOPPED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Mandatory step banner */}
                      <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg, #0A0F1E, #1a1f35)', border: '1px solid rgba(79,70,229,0.3)', borderRadius: 14 }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Mandatory Next Step</div>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem', marginBottom: 8 }}>
                          🔒 Choice results have been locked automatically
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 14px' }}>
                          The election is stopped. Student choices are now an immutable snapshot. Proceed to Results to create an allocation session and publish the final assignment.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/admin/results'} style={{ flex: 1, justifyContent: 'center', letterSpacing: '0.3px' }}>
                            📋 Open Results &amp; Allocation →
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.6 }}>
                        <strong>Note:</strong> The join link has expired. You can also run allocation rounds from the <a href="/admin/allocation" style={{ color: '#1E40AF', fontWeight: 700 }}>Allocation Panel</a> before finalising sessions in Results.
                      </div>
                    </div>
                  )}

                  {!checklist?.allReady && current.status === 'NOT_STARTED' && (
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-4)', marginTop: 4 }}>
                      ⚠ Complete all checklist items before starting.
                    </p>
                  )}
                </div>

                {/* Status timeline */}
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Lifecycle</div>
                  {[
                    { label: 'Created', done: true },
                    { label: 'Initialised', done: checklist?.checklist?.tokens?.ok && checklist?.checklist?.seats?.ok },
                    { label: 'Active', done: ['ACTIVE','PAUSED','STOPPED'].includes(current.status) },
                    { label: 'Stopped', done: current.status === 'STOPPED' },
                    { label: 'Results & Allocation', done: false, mandatory: current.status === 'STOPPED' },
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: step.done ? '#059669' : step.mandatory ? '#D97706' : 'var(--border)', border: `2px solid ${step.done ? '#059669' : step.mandatory ? '#D97706' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {step.done && <span style={{ fontSize: '0.55rem', color: 'white', fontWeight: 800 }}>✓</span>}
                        {step.mandatory && !step.done && <span style={{ fontSize: '0.55rem', color: '#D97706', fontWeight: 800 }}>!</span>}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: step.done ? 'var(--text)' : step.mandatory ? '#D97706' : 'var(--text-4)', fontWeight: step.done || step.mandatory ? 600 : 400 }}>
                        {step.label}{step.mandatory && !step.done ? ' ← next' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Past elections ── */}
        {past.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '18px 26px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Past Elections</span>
              <span className="badge badge-grey">{past.length}</span>
            </div>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead><tr><th>Election</th><th>Semester</th><th>Batch</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {past.map(e => (
                    <tr key={e.election_id}>
                      <td><strong>{e.election_name}</strong></td>
                      <td>{e.semester_tag || <span className="text-muted">—</span>}</td>
                      <td>{e.batch_tag || <span className="text-muted">—</span>}</td>
                      <td><StatusPill status={e.status} /></td>
                      <td>
                        <a href={`/admin/allocation?id=${e.election_id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.76rem' }}>Results →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <Modal title="Create New Election" onClose={() => setShowCreate(false)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? <Spinner /> : 'Create Election'}</button></>}>
            <ElectionFormFields form={form} setF={setF} setForm={setFormState} />
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--muted-bg)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
              💡 A unique join code and link will be automatically generated so participants can apply.
            </div>
          </Modal>
        )}

        {/* Edit modal */}
        {showEdit && (
          <Modal title="Edit Election" onClose={() => setShowEdit(false)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}>Cancel</button><button className="btn btn-primary" onClick={handleEdit} disabled={loading}>{loading ? <Spinner /> : 'Save Changes'}</button></>}>
            <ElectionFormFields form={form} setF={setF} setForm={setFormState} />
          </Modal>
        )}

        {/* Stop confirm modal */}
        {showStop && (
          <Modal title="⏹ Stop Election" onClose={() => setShowStop(false)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowStop(false)}>Cancel</button><button className="btn btn-danger" onClick={handleStop}>{actionLoading === 'stop' ? <Spinner /> : 'Yes, Stop Election'}</button></>}>
            <div className="alert alert-warning" style={{ marginBottom: 16 }}><strong>This cannot be undone.</strong></div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-2)' }}>Stopping will:</p>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Close all bookings immediately', 'Auto-assign remaining courses to non-participants', 'Expire the join code and link', 'Unlock the Allocation Panel for result finalisation'].map(t => (
                <div key={t} style={{ display: 'flex', gap: 8, fontSize: '0.84rem', color: 'var(--text-2)' }}>
                  <span style={{ color: '#DC2626', flexShrink: 0 }}>✕</span> {t}
                </div>
              ))}
            </div>
          </Modal>
        )}
      </main>
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

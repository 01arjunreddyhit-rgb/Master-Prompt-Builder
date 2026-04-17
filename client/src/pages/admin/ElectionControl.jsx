import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
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

      <div style={{ marginTop:8, padding:'14px 16px', background:'var(--muted-bg)', borderRadius:14, border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text)', marginBottom:4 }}>
          Join Page — Participant Field Visibility
        </div>
        <div style={{ fontSize:'0.74rem', color:'var(--text-4)', marginBottom:12, lineHeight:1.5 }}>
          Control which fields are visible to other participants on the public join page.
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
  const { selectedElection, selectElection } = useElection();
  const navigate = useNavigate();
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

  const loadStatus = useCallback((id) => {
    if (!id) return;
    api.get(`/elections/${id}/status`).then(r => setStatus(r.data.data)).catch(() => {});
    api.get(`/elections/${id}/checklist`).then(r => setChecklist(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    loadStatus(selectedElection.election_id);
    const iv = setInterval(() => loadStatus(selectedElection.election_id), 10000);
    return () => clearInterval(iv);
  }, [selectedElection, loadStatus, navigate]);

  const action = async (type) => {
    if (!selectedElection) return;
    setActionLoading(type); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/${type}`);
      setMsg({ type: 'success', text: data.message });
      loadStatus(selectedElection.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally { setActionLoading(''); }
  };

  const handleStop = async () => {
    if (!selectedElection) return;
    setShowStop(false); setActionLoading('stop'); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/stop`);
      setMsg({ type: 'success', text: data.message });
      loadStatus(selectedElection.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Stop failed.' });
    } finally { setActionLoading(''); }
  };

  const parseForm = f => ({ ...f, final_courses_per_student: parseInt(f.final_courses_per_student), faculty_count: parseInt(f.faculty_count), min_class_size: parseInt(f.min_class_size), max_class_size: parseInt(f.max_class_size) });

  const handleCreate = async () => {
    if (!form.election_name.trim()) return setMsg({ type: 'error', text: 'Election name required.' });
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.post('/elections', parseForm(form));
      setMsg({ type: 'success', text: 'Election created!' });
      setShowCreate(false); setFormState(BLANK_FORM);
      // Automatically select the new election
      if (data.election) selectElection(data.election);
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Create failed.' }); }
    finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!selectedElection || !form.election_name.trim()) return;
    setLoading(true); setMsg(null);
    try {
      await api.put(`/elections/${selectedElection.election_id}`, parseForm(form));
      setMsg({ type: 'success', text: 'Election updated.' });
      setShowEdit(false);
      // Refresh context
      selectElection({ ...selectedElection, ...form });
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' }); }
    finally { setLoading(false); }
  };

  if (!selectedElection && !showCreate) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Election Control</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {selectedElection && (
          <>
            {/* Election header card */}
            <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '-0.4px', marginBottom: 8 }}>{selectedElection.election_name}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <StatusPill status={selectedElection.status} />
                    {selectedElection.semester_tag && <span className="badge badge-blue">{selectedElection.semester_tag}</span>}
                    {selectedElection.batch_tag && <span className="badge badge-grey">{selectedElection.batch_tag}</span>}
                    <span className="badge badge-grey">ID #{selectedElection.election_id}</span>
                  </div>
                </div>
                {selectedElection.status === 'NOT_STARTED' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setFormState({ election_name: selectedElection.election_name, semester_tag: selectedElection.semester_tag || '', batch_tag: selectedElection.batch_tag || '', final_courses_per_student: selectedElection.final_courses_per_student, faculty_count: selectedElection.faculty_count, min_class_size: selectedElection.min_class_size, max_class_size: selectedElection.max_class_size, field_config: selectedElection.field_config ? (typeof selectedElection.field_config === 'string' ? JSON.parse(selectedElection.field_config) : selectedElection.field_config) : { register_number:'private', section:'public', email:'private' } });
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

            {/* CAV card */}
            <div style={{ marginBottom: 20 }}>
              <CAVCard electionId={selectedElection.election_id} />
            </div>

            {/* Checklist + Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
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
                  </>
                ) : <div style={{ textAlign: 'center', padding: 24 }}><Spinner dark /></div>}
              </div>

              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 16 }}>Election Controls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedElection.status === 'NOT_STARTED' && (
                    <button className="btn btn-success btn-full" onClick={() => action('start')} disabled={!checklist?.allReady || !!actionLoading}>
                      {actionLoading === 'start' ? <Spinner /> : '▶ START ELECTION'}
                    </button>
                  )}
                  {selectedElection.status === 'ACTIVE' && (
                    <>
                      <button className="btn btn-warning btn-full" onClick={() => action('pause')} disabled={!!actionLoading}>⏸ PAUSE</button>
                      <button className="btn btn-danger btn-full" onClick={() => setShowStop(true)} disabled={!!actionLoading}>⏹ STOP</button>
                    </>
                  )}
                  {selectedElection.status === 'PAUSED' && (
                    <button className="btn btn-success btn-full" onClick={() => action('resume')} disabled={!!actionLoading}>▶ RESUME</button>
                  )}
                  {selectedElection.status === 'STOPPED' && (
                    <Button variant="primary" onClick={() => navigate('/admin/results')}>View Final Results →</Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Create modal */}
        {showCreate && (
          <Modal title="Create New Election" onClose={() => setShowCreate(false)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? <Spinner /> : 'Create Election'}</button></>}>
            <ElectionFormFields form={form} setF={setF} setForm={setFormState} />
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
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowStop(false)}>Cancel</button><button className="btn btn-danger" onClick={handleStop}>Yes, Stop Election</button></>}>
            <div className="alert alert-warning"><strong>This cannot be undone.</strong> All bookings will be closed and results locked.</div>
          </Modal>
        )}
      </main>
    </div>
  );
}

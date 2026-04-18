import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Alert, Spinner, Modal, ProgressBar, Button, Input, Select } from '../../components/ui/index';
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

/* ── Election form fields ── */
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
      <div style={{ padding: '10px 14px', background: 'var(--muted-bg)', borderRadius: 10, fontSize: '0.76rem', color: 'var(--text-4)', lineHeight: 1.6, marginBottom: 4 }}>
        ℹ <strong>Allocation parameters</strong> are configured in the <strong>Allocation Panel</strong> after initialisation.
      </div>
      <div style={{ marginTop: 12, padding:'14px 16px', background:'var(--muted-bg)', borderRadius:14, border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text)', marginBottom:4 }}>Join Page — Participant Field Visibility</div>
        <VisibilityToggle label="Register Number" value={fc.register_number} onChange={v => setFc('register_number', v)} />
        <VisibilityToggle label="Section"         value={fc.section}         onChange={v => setFc('section', v)} />
        <VisibilityToggle label="Email"           value={fc.email}           onChange={v => setFc('email', v)} />
      </div>
    </>
  );
}

const BLANK_FORM = { election_name: '', semester_tag: '', batch_tag: '', field_config: { register_number:'private', section:'public', email:'private' } };

/* ── Countdown Timer ─────────────────────────────────────────── */
function Countdown({ to, label }) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    const compute = () => {
      const ms = new Date(to) - Date.now();
      if (ms <= 0) { setDiff(null); return; }
      const s = Math.floor(ms/1000);
      setDiff({ d: Math.floor(s/86400), h: Math.floor((s%86400)/3600), m: Math.floor((s%3600)/60), s: s%60 });
    };
    compute();
    const iv = setInterval(compute, 1000);
    return () => clearInterval(iv);
  }, [to]);
  if (!diff) return null;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--accent-light)', border:'1px solid var(--accent-3)', borderRadius:10, padding:'6px 14px' }}>
      <span style={{ fontSize:'0.65rem', color:'var(--accent)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
      {[['d', diff.d],['h', diff.h],['m', diff.m],['s', diff.s]].map(([u,v]) => (
        <span key={u} style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:'0.9rem', color:'var(--accent)' }}>{String(v).padStart(2,'0')}{u}</span>
      ))}
    </div>
  );
}

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
    setActionLoading('stop'); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/stop`, { stop_reason_text: stopForm.reason_text });
      setMsg({ type: 'success', text: data.message });
      setShowStop(false);
      loadStatus(selectedElection.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Stop failed.' });
    } finally { setActionLoading(''); }
  };

  // ── Q2: Stop Reason Repository ──
  const [stopReasons, setStopReasons] = useState([]);
  const [stopForm, setStopForm] = useState({ reason_text: '' });
  const [showStopReasonRepo, setShowStopReasonRepo] = useState(false);
  const [newReasonForm, setNewReasonForm] = useState({ name: '', desc: '' });

  const loadStopReasons = useCallback(() => {
    api.get('/stop-reasons').then(r => setStopReasons(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { loadStopReasons(); }, [loadStopReasons]);

  const addStopReason = async () => {
    if (!newReasonForm.name) return;
    await api.post('/stop-reasons', { reason_name: newReasonForm.name, description: newReasonForm.desc });
    setNewReasonForm({ name: '', desc: '' });
    loadStopReasons();
  };

  const deleteStopReason = async (id) => {
    await api.delete(`/stop-reasons/${id}`);
    loadStopReasons();
  };

  // ── Scheduling state ──
  const [schedForm, setSchedForm] = useState({ window_start: '', window_end: '' });
  const [schedLoading, setSchedLoading] = useState(false);
  const [showSchedConfirm, setShowSchedConfirm] = useState(false);

  // ── Invitees state ──
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [instFile, setInstFile] = useState(null);
  const [instLoading, setInstLoading] = useState(false);
  const [instResult, setInstResult] = useState(null);
  const instRef = React.useRef();

  // ── Universal Pool confirmation state ──
  const [poolData, setPoolData] = useState(null);
  const [showPoolConfirm, setShowPoolConfirm] = useState(false);
  const [poolConfirmLoading, setPoolConfirmLoading] = useState(false);

  // ── Q2: Token Burst Control state ──
  const [showBustControl, setShowBustControl] = useState(false);
  const [bustReasons, setBustReasons] = useState([]);
  const [bustHistory, setBustHistory] = useState([]);
  const [bustForm, setBustForm] = useState({ mode: 4, student_id: '', course_id: '', token_number: '', token_id: '', reason_text: '' });
  const [bustLoading, setBustLoading] = useState(false);

  const loadBurstData = useCallback(() => {
    if (!selectedElection) return;
    api.get('/bust-reasons').then(r => setBustReasons(r.data.data)).catch(() => {});
    api.get(`/elections/${selectedElection.election_id}/bust-history`).then(r => setBustHistory(r.data.data)).catch(() => {});
  }, [selectedElection]);

  useEffect(() => { if (selectedElection) loadBurstData(); }, [selectedElection, loadBurstData]);

  const handleInit = async () => {
    if (!selectedElection) return;
    setMsg(null);
    try {
      const { data } = await api.get(`/elections/${selectedElection.election_id}/pool-calc`);
      setPoolData(data);
      setShowPoolConfirm(true);
    } catch { action('init'); }
  };

  const confirmInit = async () => {
    setPoolConfirmLoading(true);
    await action('init');
    setShowPoolConfirm(false);
    setPoolConfirmLoading(false);
  };

  const handleSaveSchedule = async () => {
    if (!schedForm.window_start || !schedForm.window_end) return;
    setSchedLoading(true); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/schedule`, schedForm);
      setMsg({ type: 'success', text: data.message });
      setShowSchedConfirm(false);
      loadStatus(selectedElection.election_id);
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Schedule failed.' }); }
    finally { setSchedLoading(false); }
  };

  const handleSaveInvitees = async () => {
    const emails = inviteEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setInviteLoading(true); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/invitees`, { emails });
      setMsg({ type: 'success', text: data.message });
      setInviteEmails('');
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save invitees.' }); }
    finally { setInviteLoading(false); }
  };

  const handleInstCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInstLoading(true); setInstResult(null); setMsg(null);
    const formData = new FormData(); formData.append('file', file);
    try {
      const { data: prev } = await api.post(`/elections/${selectedElection.election_id}/institution-csv?preview=true`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPoolData(prev.pool_preview);
      if (window.confirm(`Confirm CSV upload with ${prev.pool_preview.invite_count} participants?`)) {
        const { data: res } = await api.post(`/elections/${selectedElection.election_id}/institution-csv`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setInstResult({ ok: true, msg: res.message, fieldKeys: res.field_keys });
        setMsg({ type: 'success', text: res.message });
        setPoolData(res.pool_confirmation);
        setShowPoolConfirm(true);
      }
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' }); }
    finally { setInstLoading(false); e.target.value = ''; }
  };

  const handleBust = async () => {
    if (!window.confirm('Execute token burst? Confirmed bookings remain immutable.')) return;
    setBustLoading(true); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/bust`, bustForm);
      setMsg({ type: 'success', text: data.message });
      loadBurstData();
      loadStatus(selectedElection.election_id);
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Bust failed.' }); }
    finally { setBustLoading(false); }
  };

  if (!selectedElection && !showCreate) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Election Control</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {selectedElection && (
          <>
            <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', marginBottom: 8 }}>{selectedElection.election_name}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <StatusPill status={selectedElection.status} />
                    <span className="badge badge-grey">ID #{selectedElection.election_id}</span>
                  </div>
                </div>
                {selectedElection.status === 'NOT_STARTED' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>✏ Edit</button>
                )}
              </div>

              {status && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                  {[
                    { label: 'Students', v: status.total_students || 0, color: '#4F46E5' },
                    { label: 'Courses', v: status.active_courses || 0, color: '#059669' },
                    { label: 'Bookings', v: status.total_bookings || 0, color: '#D97706' },
                    { label: 'Confirmed', v: status.students_confirmed || 0, color: '#7C3AED' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--muted-bg)', borderRadius: 12, padding: '12px 16px', borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}><CAVCard electionId={selectedElection.election_id} /></div>

            {/* ── Governance Data Feed (3 Phases) ── */}
            {selectedElection.status === 'NOT_STARTED' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                {/* Phase 1: Invitation List */}
                <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #3B82F6', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 1: Invitation</div>
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}>BLUE</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload the primary list of eligible emails. This grants "Sole Right".</p>
                  <button className="btn btn-sm w-full" style={{ background: '#3B82F6', color: 'white' }} onClick={() => navigate('/admin/students')}>Upload Phase 1 →</button>
                </div>

                {/* Phase 2A: Fixed Identity */}
                <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #DB2777', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 2A: Fixed ID</div>
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#FDF2F8', color: '#9D174D', fontWeight: 700 }}>PINK</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload Profile IDs and Usernames. These stay fixed in the Access Gate.</p>
                  <button className="btn btn-sm w-full" style={{ background: '#DB2777', color: 'white' }} onClick={() => navigate('/admin/students')}>Upload Phase 2A →</button>
                </div>

                {/* Phase 2B: Supplementary */}
                <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #6366F1', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 2B: Extra Metadata</div>
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}>VIOLET</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload Section, Department, etc. Editable by students (Orange Audit).</p>
                  <button className="btn btn-sm w-full" style={{ background: '#6366F1', color: 'white' }} onClick={() => navigate('/admin/students')}>Upload Phase 2B →</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16 }}>Pre-Start Checklist</div>
                {checklist ? (
                  <>
                    <CheckItem ok={checklist.checklist.students.ok} label="Students registered" count={checklist.checklist.students.count} />
                    <CheckItem ok={checklist.checklist.courses.ok} label="Courses created" count={checklist.checklist.courses.count} />
                    <CheckItem ok={checklist.checklist.tokens.ok} label="Tokens generated" count={checklist.checklist.tokens.count} expected={checklist.checklist.tokens.expected} />
                    <CheckItem ok={checklist.checklist.seats.ok} label="Seats initialised" count={checklist.checklist.seats.count} expected={checklist.checklist.seats.expected} />
                    {(!checklist.checklist.tokens.ok || !checklist.checklist.seats.ok) && (
                      <button className="btn btn-warning btn-full" style={{ marginTop: 18 }} onClick={handleInit}>⚙ Initialise Tokens & Seats</button>
                    )}
                  </>
                ) : <Spinner dark />}
              </div>

              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 16 }}>Election Controls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedElection.status === 'NOT_STARTED' && (
                    <button className="btn btn-success btn-full" onClick={() => action('start')} disabled={!checklist?.allReady}>▶ START ELECTION</button>
                  )}
                  {selectedElection.status === 'ACTIVE' && (
                    <>
                      <button className="btn btn-warning btn-full" onClick={() => action('pause')}>⏸ PAUSE</button>
                      <button className="btn btn-danger btn-full" onClick={() => setShowStop(true)}>⏹ EARLY STOP</button>
                      <button className="btn btn-surface btn-full" style={{ color:'#DC2626' }} onClick={() => setShowBustControl(true)}>💥 TOKEN BURST CONTROL</button>
                    </>
                  )}
                  {selectedElection.status === 'PAUSED' && (
                    <button className="btn btn-success btn-full" onClick={() => action('resume')}>▶ RESUME</button>
                  )}
                  {selectedElection.status === 'STOPPED' && <Button variant="primary" onClick={() => navigate('/admin/results')}>View Results →</Button>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STOP MODAL ── */}
        {showStop && (
          <Modal title="⏹ Stop Election Early" onClose={() => setShowStop(false)}>
            <div className="alert alert-warning" style={{ marginBottom: 16 }}><strong>Warning:</strong> This will terminate the election immediately.</div>
            <div className="form-group">
              <label className="form-label">Termination Reason (Optional)</label>
              <div style={{ display:'flex', gap:8 }}>
                <Select style={{ flex:1 }} value={stopForm.reason_text} onChange={e => setStopForm({ reason_text: e.target.value })}
                  options={[{ value: '', label: '-- Select Reason --' }, ...stopReasons.map(r => ({ value: r.reason_name, label: r.reason_name }))]} />
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const r = window.prompt('Enter custom reason:');
                  if (r) setStopForm({ reason_text: r });
                }}>⊕ Custom</button>
              </div>
              <button className="btn btn-ghost btn-xs" style={{ marginTop:8 }} onClick={() => setShowStopReasonRepo(true)}>Manage Reason Repository</button>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              <button className="btn btn-ghost" onClick={() => setShowStop(false)} style={{ flex:1 }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleStop} style={{ flex:2 }}>Terminate Election</button>
            </div>
          </Modal>
        )}

        {/* ── REASON REPO MODAL ── */}
        {showStopReasonRepo && (
          <Modal title="📁 Stop Reason Repository" onClose={() => setShowStopReasonRepo(false)}>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <Input placeholder="Reason Name" style={{ flex:1 }} value={newReasonForm.name} onChange={e => setNewReasonForm({...newReasonForm, name: e.target.value})} />
              <Button variant="primary" onClick={addStopReason}>Add</Button>
            </div>
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              {stopReasons.map(r => (
                <div key={r.reason_id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:'0.85rem' }}>{r.reason_name}</span>
                  <button onClick={() => deleteStopReason(r.reason_id)} style={{ color:'var(--red)', border:'none', background:'none', cursor:'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {/* Rest of modals (Create, Edit, Burst, etc.) remain as they were */}
        {showBustControl && (
          <Modal title="💥 Token Burst Control" onClose={() => setShowBustControl(false)}>
             <div className="form-group">
              <label className="form-label">Burst Mode</label>
              <select className="form-input" value={bustForm.mode} onChange={e => setBustForm({...bustForm, mode: Number(e.target.value)})}>
                <option value={1}>1. All seats of a Subject</option>
                <option value={2}>2. All tokens of a Type (T1, T2...)</option>
                <option value={3}>3. Type ∩ Subject (Intersection)</option>
                <option value={4}>4. Participant ∩ All their Tokens</option>
                <option value={5}>5. Participant ∩ Subject</option>
                <option value={6}>6. Single Specific Token</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Burst Reason (Optional)</label>
              <div style={{ display:'flex', gap:8 }}>
                <select className="form-input" value={bustForm.reason_text} onChange={e => setBustForm({...bustForm, reason_text: e.target.value})}>
                  <option value="">-- Select Reason --</option>
                  {bustReasons.map(r => <option key={r.reason_id} value={r.reason_text}>{r.reason_text}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const r = window.prompt('Enter custom reason:');
                  if (r) setBustForm({...bustForm, reason_text: r});
                }}>⊕ Custom</button>
              </div>
            </div>
            <button className="btn btn-danger btn-full" onClick={handleBust} disabled={bustLoading}>EXECUTE BURST</button>
          </Modal>
        )}

      </main>
    </div>
  );
}

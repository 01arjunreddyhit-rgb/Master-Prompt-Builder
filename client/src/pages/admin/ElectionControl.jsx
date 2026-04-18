import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Alert, Spinner, Modal, ProgressBar, Button } from '../../components/ui/index';
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

/* ── Election form fields (Instruction 4: no cap limits at creation) ── */
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
      {/* Cap limits removed from creation form — moved to Allocation Panel (Tortoise) */}
      <div style={{ padding: '10px 14px', background: 'var(--muted-bg)', borderRadius: 10, fontSize: '0.76rem', color: 'var(--text-4)', lineHeight: 1.6, marginBottom: 4 }}>
        ℹ <strong>Allocation parameters</strong> (min/max class size, faculty count, courses per student) are configured in the <strong>Allocation Panel</strong> after initialisation.
      </div>
      <div style={{ marginTop: 12, padding:'14px 16px', background:'var(--muted-bg)', borderRadius:14, border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text)', marginBottom:4 }}>Join Page — Participant Field Visibility</div>
        <div style={{ fontSize:'0.74rem', color:'var(--text-4)', marginBottom:12, lineHeight:1.5 }}>Control which fields are visible to participants on the public join page.</div>
        <VisibilityToggle label="Register Number" value={fc.register_number} onChange={v => setFc('register_number', v)} />
        <VisibilityToggle label="Section"         value={fc.section}         onChange={v => setFc('section', v)} />
        <VisibilityToggle label="Email"           value={fc.email}           onChange={v => setFc('email', v)} />
      </div>
    </>
  );
}

const BLANK_FORM = { election_name: '', semester_tag: '', batch_tag: '', field_config: { register_number:'private', section:'public', email:'private' } };

/* ── Countdown Timer (Instruction 3) ─────────────────────────── */
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
    setShowStop(false); setActionLoading('stop'); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/stop`);
      setMsg({ type: 'success', text: data.message });
      loadStatus(selectedElection.election_id);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Stop failed.' });
    } finally { setActionLoading(''); }
  };

  const parseForm = f => ({ election_name: f.election_name, semester_tag: f.semester_tag, batch_tag: f.batch_tag, field_config: f.field_config });

  // ── Instruction 3: Schedule state
  const [schedForm, setSchedForm] = useState({ window_start: '', window_end: '' });
  const [schedLoading, setSchedLoading] = useState(false);
  const [showSchedConfirm, setShowSchedConfirm] = useState(false);

  // ── Instruction 4/5: Invitees state
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [instFile, setInstFile] = useState(null);
  const [instLoading, setInstLoading] = useState(false);
  const [instResult, setInstResult] = useState(null);
  const instRef = React.useRef();

  // ── Instruction 2/4: Universal Pool confirmation state
  const [poolData, setPoolData] = useState(null);
  const [showPoolConfirm, setShowPoolConfirm] = useState(false);
  const [poolConfirmLoading, setPoolConfirmLoading] = useState(false);

  // ── Q2: Token Burst Control state
  const [showBustControl, setShowBustControl] = useState(false);
  const [bustReasons, setBustReasons] = useState([]);
  const [bustHistory, setBustHistory] = useState([]);
  const [bustForm, setBustForm] = useState({ mode: 4, student_id: '', course_id: '', token_number: '', token_id: '', reason_text: '' });
  const [bustLoading, setBustLoading] = useState(false);

  // ── Q2: Field Config (Primary Identity Fields)
  const [fieldConfig, setFieldConfig] = useState([]); // [{ key, label, type }]
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  const loadBurstData = useCallback(() => {
    if (!selectedElection) return;
    api.get('/bust-reasons').then(r => setBustReasons(r.data.data)).catch(() => {});
    api.get(`/elections/${selectedElection.election_id}/bust-history`).then(r => setBustHistory(r.data.data)).catch(() => {});
  }, [selectedElection]);

  useEffect(() => {
    if (selectedElection) loadBurstData();
  }, [selectedElection, loadBurstData]);

  const handleInit = async () => {
    if (!selectedElection) return;
    setMsg(null);
    // Fetch pool calculation first (Instruction 2 & 4)
    try {
      const { data } = await api.get(`/elections/${selectedElection.election_id}/pool-calc`);
      setPoolData(data);
      setShowPoolConfirm(true);
    } catch {
      // Fallback: init directly if pool-calc fails
      action('init');
    }
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
      // Step 1: Preview & Pool Calculation (Q2 correction: Pool popup here)
      const { data: prev } = await api.post(`/elections/${selectedElection.election_id}/institution-csv?preview=true`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setPoolData(prev.pool_preview);
      
      const confirmMsg = `CSV contains ${prev.headers?.length} columns.\n\n` +
        `Eligible Participants: ${prev.pool_preview.invite_count}\n` +
        `Universal Seat Pool: ${prev.pool_preview.universal_pool} (${prev.pool_preview.formula})\n\n` +
        `Upload and confirm this pool setup?`;

      if (window.confirm(confirmMsg)) {
        // Step 2: Commit
        const { data: res } = await api.post(`/elections/${selectedElection.election_id}/institution-csv`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setInstResult({ ok: true, msg: res.message, fieldKeys: res.field_keys });
        setMsg({ type: 'success', text: res.message });
        
        // Q2: Show the formal Pool Confirmation Modal after successful upload
        setPoolData(res.pool_confirmation);
        setShowPoolConfirm(true);
      }
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed.' }); }
    finally { setInstLoading(false); e.target.value = ''; }
  };

  const handleBust = async () => {
    if (!window.confirm('Are you sure? This will invalidate tokens. Bookings already completed will remain (immutable).')) return;
    setBustLoading(true); setMsg(null);
    try {
      const { data } = await api.post(`/elections/${selectedElection.election_id}/bust`, bustForm);
      setMsg({ type: 'success', text: data.message });
      loadBurstData();
      loadStatus(selectedElection.election_id);
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Bust failed.' }); }
    finally { setBustLoading(false); }
  };

  const addBurstReason = async (text) => {
    await api.post('/bust-reasons', { reason_text: text });
    loadBurstData();
  };

  const handleAddField = () => setFieldConfig(prev => [...prev, { key: '', label: '', type: 'text' }]);
  const saveFieldConfig = async () => {
    try {
      await api.post(`/elections/${selectedElection.election_id}/invite-field-config`, { fields: fieldConfig });
      setShowFieldConfig(false);
      setMsg({ type: 'success', text: 'Field configuration saved.' });
    } catch { setMsg({ type: 'error', text: 'Failed to save config.' }); }
  };

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
                        onClick={handleInit} disabled={actionLoading === 'init'}>
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
                      <button className="btn btn-surface btn-full" style={{ borderColor:'#FCA5A5', color:'#DC2626' }} onClick={() => setShowBustControl(true)}>
                        💥 TOKEN BURST CONTROL
                      </button>
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

        {/* ── INSTRUCTION 3: Schedule Panel ── */}
        {selectedElection && selectedElection.status === 'NOT_STARTED' && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4 }}>⏰ Auto-Schedule Election</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginBottom: 16, lineHeight: 1.6 }}>
              Lock in a start and end time. The system will automatically open and close the election — no manual action needed.
            </div>
            {selectedElection.window_start && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Countdown to={selectedElection.window_start} label="Opens in" />
                {selectedElection.window_end && <Countdown to={selectedElection.window_end} label="Closes in" />}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Auto-Start (window opens)</label>
                <input type="datetime-local" className="form-input" value={schedForm.window_start}
                  onChange={e => setSchedForm(f => ({ ...f, window_start: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Auto-Stop (window closes)</label>
                <input type="datetime-local" className="form-input" value={schedForm.window_end}
                  onChange={e => setSchedForm(f => ({ ...f, window_end: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSchedConfirm(true)}
              disabled={!schedForm.window_start || !schedForm.window_end}>
              Lock In Schedule
            </button>
          </div>
        )}

        {/* ── INSTRUCTION 4/5: Invitees Panel ── */}
        {selectedElection && selectedElection.status === 'NOT_STARTED' && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '22px 26px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4 }}>📧 Eligible Participants (Invitee List)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginBottom: 16, lineHeight: 1.6 }}>
              Paste eligible student emails below (one per line, or comma-separated). Students on this list get a fast-track verification popup. Students <em>not</em> on this list will fill a dynamic registration form.
            </div>
            <textarea className="form-input" rows={5} placeholder="student1@college.edu\nstudent2@college.edu\n..."
              value={inviteEmails} onChange={e => setInviteEmails(e.target.value)}
              style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', marginBottom: 12, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveInvitees} disabled={inviteLoading || !inviteEmails.trim()}>
                {inviteLoading ? <Spinner /> : 'Save Invitee List'}
              </button>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>or</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="file" accept=".csv" ref={instRef} onChange={handleInstCSV} style={{ display: 'none' }} />
                <button className="btn btn-surface btn-sm" onClick={() => instRef.current?.click()} disabled={instLoading}>
                  {instLoading ? <Spinner /> : '📂 Upload Institution CSV'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFieldConfig(true)}>
                  ⊕ Pre-define Fields
                </button>
              </div>
            </div>
            {instResult?.ok && (
              <div style={{ marginTop: 10, padding: '8px 14px', background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: '0.76rem', color: '#065F46' }}>
                ✓ {instResult.msg}{instResult.fieldKeys?.length ? ` — Dynamic form fields: ${instResult.fieldKeys.join(', ')}` : ''}
              </div>
            )}
          </div>
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

        {/* ── INSTRUCTION 2/4: Universal Pool Confirmation Popup ── */}
        {showPoolConfirm && poolData && (
          <Modal title="⚙ Confirm Initialisation" onClose={() => setShowPoolConfirm(false)}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Universal Seat Pool Formula</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>{poolData.student_count}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Students</div>
                </div>
                <div style={{ fontSize: '1.5rem', color: 'var(--text-4)', fontWeight: 300 }}>×</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>{poolData.course_count}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Subjects</div>
                </div>
                <div style={{ fontSize: '1.5rem', color: 'var(--text-4)', fontWeight: 300 }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>{poolData.universal_pool}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Seats</div>
                </div>
              </div>
              <div style={{ background: 'var(--muted-bg)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-3)' }}>
                {poolData.formula}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', lineHeight: 1.6 }}>
                Each student receives <strong>{poolData.tokens_per_student} tokens</strong> — one per subject. Cap limits are applied later in the Allocation Panel.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPoolConfirm(false)} style={{ flex: 1 }}>Review Setup</button>
              <button className="btn btn-warning" onClick={confirmInit} disabled={poolConfirmLoading} style={{ flex: 2 }}>
                {poolConfirmLoading ? <Spinner /> : `Accept & Initialise ${poolData.universal_pool} Seats`}
              </button>
            </div>
          </Modal>
        )}

        {/* ── INSTRUCTION 3: Schedule Lock-In Confirmation ── */}
        {showSchedConfirm && (
          <Modal title="🔒 Lock In Schedule" onClose={() => setShowSchedConfirm(false)}>
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              This schedule is <strong>autonomous</strong>. The election will open and close automatically at the specified times.
            </div>
            <div style={{ background: 'var(--muted-bg)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-4)' }}>Auto-Start</span>
                <strong>{schedForm.window_start ? new Date(schedForm.window_start).toLocaleString() : '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-4)' }}>Auto-Stop</span>
                <strong>{schedForm.window_end ? new Date(schedForm.window_end).toLocaleString() : '—'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSchedConfirm(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSchedule} disabled={schedLoading} style={{ flex: 2 }}>
                {schedLoading ? <Spinner /> : 'Confirm Autonomous Schedule'}
              </button>
            </div>
          </Modal>
        )}

        {/* Q2: Field Config Modal */}
        {showFieldConfig && (
          <Modal title="Pre-define CSV Fields" onClose={() => setShowFieldConfig(false)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setShowFieldConfig(false)}>Cancel</button><button className="btn btn-primary" onClick={saveFieldConfig}>Save Configuration</button></>}>
            <div style={{ fontSize:'0.8rem', color:'var(--text-4)', marginBottom:16 }}>
              Define the column headers you expect in your Institution CSV. These will become the dynamic form fields for uninvited students.
            </div>
            {fieldConfig.map((f, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input className="form-input" placeholder="Column Key (e.g. section)" value={f.key} onChange={e => {
                  const nc = [...fieldConfig]; nc[i].key = e.target.value.toLowerCase().replace(/\s+/g,'_'); setFieldConfig(nc);
                }} />
                <input className="form-input" placeholder="Display Label" value={f.label} onChange={e => {
                  const nc = [...fieldConfig]; nc[i].label = e.target.value; setFieldConfig(nc);
                }} />
                <button className="btn btn-ghost" onClick={() => setFieldConfig(fieldConfig.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
            <button className="btn btn-surface btn-sm" onClick={handleAddField}>+ Add Field</button>
          </Modal>
        )}

        {/* Q2: Token Burst Control Modal */}
        {showBustControl && (
          <Modal title="💥 Token Burst Control" onClose={() => setShowBustControl(false)}>
            <div style={{ marginBottom:16, fontSize:'0.75rem', color:'var(--text-4)', lineHeight:1.5 }}>
              Invalidate specific tokens or sets of tokens. Bookings already confirmed are <strong>immutable</strong> and will remain in the results.
            </div>
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

            {(bustForm.mode === 4 || bustForm.mode === 5) && (
              <div className="form-group">
                <label className="form-label">Target Student ID</label>
                <input className="form-input" placeholder="Enter student database ID" value={bustForm.student_id} onChange={e => setBustForm({...bustForm, student_id: e.target.value})} />
              </div>
            )}
            {(bustForm.mode === 1 || bustForm.mode === 3 || bustForm.mode === 5) && (
              <div className="form-group">
                <label className="form-label">Target Course ID</label>
                <input className="form-input" placeholder="Enter course database ID" value={bustForm.course_id} onChange={e => setBustForm({...bustForm, course_id: e.target.value})} />
              </div>
            )}
            {(bustForm.mode === 2 || bustForm.mode === 3) && (
              <div className="form-group">
                <label className="form-label">Token Number</label>
                <input className="form-input" type="number" value={bustForm.token_number} onChange={e => setBustForm({...bustForm, token_number: e.target.value})} />
              </div>
            )}
            {bustForm.mode === 6 && (
              <div className="form-group">
                <label className="form-label">Specific Token ID</label>
                <input className="form-input" value={bustForm.token_id} onChange={e => setBustForm({...bustForm, token_id: e.target.value})} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Burst Reason (Optional)</label>
              <div style={{ display:'flex', gap:8 }}>
                <select className="form-input" value={bustForm.reason_text} onChange={e => setBustForm({...bustForm, reason_text: e.target.value})}>
                  <option value="">-- Select from Repository --</option>
                  {bustReasons.map(r => <option key={r.reason_id} value={r.reason_text}>{r.reason_text}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const r = window.prompt('Enter custom reason:');
                  if (r) setBustForm({...bustForm, reason_text: r});
                }}>⊕ Custom</button>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <button className="btn btn-danger btn-full" onClick={handleBust} disabled={bustLoading}>
                {bustLoading ? <Spinner /> : 'EXECUTE BURST'}
              </button>
            </div>

            {/* History mini-table */}
            <div style={{ marginTop:24 }}>
              <div style={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', color:'var(--text-4)', marginBottom:8 }}>Recent Bursts</div>
              <div style={{ maxHeight:150, overflowY:'auto', background:'var(--muted-bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                {bustHistory.length === 0 ? <div style={{ padding:12, fontSize:'0.75rem', color:'var(--text-4)' }}>No history yet.</div> : (
                  <table style={{ width:'100%', fontSize:'0.7rem', borderCollapse:'collapse' }}>
                    <thead style={{ position:'sticky', top:0, background:'var(--muted-bg)', borderBottom:'1px solid var(--border)' }}>
                      <tr>
                        <th style={{ textAlign:'left', padding:'6px 10px' }}>Mode</th>
                        <th style={{ textAlign:'left', padding:'6px 10px' }}>Target</th>
                        <th style={{ textAlign:'right', padding:'6px 10px' }}>Busted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bustHistory.map(h => (
                        <tr key={h.bust_id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'6px 10px' }}>Mode {h.bust_mode}</td>
                          <td style={{ padding:'6px 10px' }}>{h.student_name || h.course_name || `Token #${h.target_token_number}`}</td>
                          <td style={{ padding:'6px 10px', textAlign:'right' }}>{h.tokens_busted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

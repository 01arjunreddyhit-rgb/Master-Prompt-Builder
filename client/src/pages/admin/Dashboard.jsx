import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Modal, Input, Button, Alert, Card, Spinner } from '../../components/ui/index';
import api from '../../services/api';

function useCounter(target, dur = 1000) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current; const to = target ?? 0; prev.current = to;
    const t0 = performance.now();
    const run = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [target, dur]);
  return v;
}

function Donut({ segments = [], size = 110, stroke = 13, label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.v || 0), 0) || 1;
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const pct = seg.v / total;
          const d = pct * circ;
          const arc = (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.c}
              strokeWidth={stroke} strokeDasharray={`${d} ${circ - d}`}
              strokeDashoffset={-off} strokeLinecap="butt"
              style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.1}s` }}
            />
          );
          off += d;
          return arc;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        {label !== undefined && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.5px', lineHeight: 1 }}>{label}</div>}
        {sub && <div style={{ fontSize: '0.58rem', color: 'var(--text-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function AreaLine({ data = [], color = '#4F46E5', h = 64 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1); const min = Math.min(...data, 0);
  const W = 240; const pad = 6;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2),
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${h} L0,${h} Z`;
  const id = `ag${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ label, value, sub, color, spark, trend, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)', borderRadius: 18, padding: '20px 22px',
        border: `1.5px solid ${hover ? color : 'var(--border)'}`,
        boxShadow: hover ? `0 8px 32px ${color}22` : 'var(--shadow-sm)',
        transition: 'all 0.22s', cursor: onClick ? 'pointer' : 'default',
        transform: hover && onClick ? 'translateY(-3px)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '18px 18px 0 0' }} />
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, color: 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.73rem', color: 'var(--text-4)' }}>{sub}</span>
        {trend !== undefined && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: (typeof trend === 'string' ? trend.startsWith('+') : trend >= 0) ? '#059669' : '#DC2626' }}>
            {(typeof trend === 'string' ? trend.startsWith('+') : trend >= 0) ? '↑' : '↓'} {typeof trend === 'string' ? trend.replace(/[+-]/, '') : Math.abs(trend)}
          </span>
        )}
      </div>
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 12, height: 36, opacity: 0.7 }}>
          <AreaLine data={spark} color={color} h={36} />
        </div>
      )}
    </div>
  );
}

// ── Launch Pad Modal: New or Copy ─────────────────────────────
function LaunchPadModal({ onClose, elections, onCreated }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'new' | 'copy'
  const [selectedSource, setSelectedSource] = useState(null);
  const [form, setForm] = useState({ election_name: '', semester_tag: '', batch_tag: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.election_name.trim()) { setError('Election name is required.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/elections', {
        election_name: form.election_name.trim(),
        semester_tag: form.semester_tag || undefined,
        batch_tag: form.batch_tag || undefined,
      });
      onCreated(data.election);
    } catch (err) { setError(err.response?.data?.message || 'Create failed.'); }
    finally { setLoading(false); }
  };

  const handleCopy = async () => {
    if (!selectedSource) { setError('Select an election to copy from.'); return; }
    if (!form.election_name.trim()) { setError('New election name is required.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/elections/${selectedSource.election_id}/copy`, {
        election_name: form.election_name.trim(),
      });
      onCreated(data.election);
    } catch (err) { setError(err.response?.data?.message || 'Copy failed.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Create Election" onClose={onClose}>
      {step === 'choose' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
            Start fresh or replicate the structure of an existing election (courses are copied over).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <button onClick={() => setStep('new')} style={{
              padding: '28px 20px', borderRadius: 18, border: '2px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              fontFamily: 'var(--font)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>✨</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>New Election</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', lineHeight: 1.5 }}>Start completely fresh with a blank election.</div>
            </button>
            <button onClick={() => { if (elections.length === 0) { setError('No existing elections to copy from.'); return; } setStep('copy'); }} style={{
              padding: '28px 20px', borderRadius: 18, border: '2px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              fontFamily: 'var(--font)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>Copy Existing</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', lineHeight: 1.5 }}>Replicate an election's name, batch, and course list.</div>
            </button>
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginTop: 12, fontWeight: 600 }}>{error}</div>}
        </div>
      )}

      {step === 'new' && (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('choose'); setError(''); }} style={{ marginBottom: 20 }}>← Back</button>
          <div className="form-group">
            <label className="form-label">Election Name *</label>
            <input className="form-input" placeholder="e.g. 6th Semester Elective 2026" value={form.election_name} onChange={setF('election_name')} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Semester Tag</label>
              <input className="form-input" placeholder="6th Sem" value={form.semester_tag} onChange={setF('semester_tag')} />
            </div>
            <div className="form-group">
              <label className="form-label">Batch Tag</label>
              <input className="form-input" placeholder="2023–2027" value={form.batch_tag} onChange={setF('batch_tag')} />
            </div>
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: 12, fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={loading} style={{ flex: 2 }}>
              {loading ? <Spinner /> : 'Create Election →'}
            </Button>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-4)', marginTop: 12, lineHeight: 1.5 }}>
            ℹ Cap limits, faculty count, and courses-per-student are configured later in the Allocation Panel.
          </p>
        </div>
      )}

      {step === 'copy' && (
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('choose'); setError(''); setSelectedSource(null); }} style={{ marginBottom: 20 }}>← Back</button>
          <div className="form-group">
            <label className="form-label">Copy From *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
              {elections.map(e => (
                <button key={e.election_id} onClick={() => setSelectedSource(e)} style={{
                  padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${selectedSource?.election_id === e.election_id ? '#7C3AED' : 'var(--border)'}`,
                  background: selectedSource?.election_id === e.election_id ? 'rgba(124,58,237,0.06)' : 'var(--surface)',
                  fontFamily: 'var(--font)', transition: 'all 0.15s',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{e.election_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 2 }}>{e.semester_tag || '—'} · {e.batch_tag || '—'} · {e.status}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New Election Name *</label>
            <input className="form-input" placeholder="Give it a unique name…" value={form.election_name} onChange={setF('election_name')} autoFocus />
          </div>
          {selectedSource && (
            <div style={{ background: 'rgba(124,58,237,0.07)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: '0.78rem', color: 'var(--text-3)' }}>
              Courses from <strong>{selectedSource.election_name}</strong> will be copied. Invitees and tokens will not be copied.
            </div>
          )}
          {error && <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: 12, fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" onClick={handleCopy} disabled={loading || !selectedSource} style={{ flex: 2 }}>
              {loading ? <Spinner /> : 'Copy & Create →'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const { selectElection, selectedElection } = useElection();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLaunchPad, setShowLaunchPad] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [delError, setDelError] = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get('/elections'), api.get('/admin/students'), api.get('/admin/pending')])
      .then(([eR, sR, pR]) => {
        setElections(eR.data.data || []);
        setStudentCount(sR.data.total || 0);
        setPendingCount((pR.data.data || []).filter(p => p.status === 'PENDING').length);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (election) => {
    setShowLaunchPad(false);
    if (election) {
      selectElection(election);
      navigate('/admin/election');
    } else {
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (confirmCode !== deleting.election_code) { setDelError('Code mismatch. Please type the exact election code.'); return; }
    setDelLoading(true); setDelError(null);
    try {
      await api.delete(`/elections/${deleting.election_id}`, { data: { confirm_code: confirmCode } });
      setDeleting(null); setConfirmCode(''); load();
    } catch (err) { setDelError(err.response?.data?.message || 'Error deleting election.'); }
    finally { setDelLoading(false); }
  };

  const currentCount = elections.length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 5 }}>{greeting}</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', lineHeight: 1.2 }}>
              Election Workspace Hub
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginTop: 4 }}>
              Manage up to 50 active and past elections &nbsp;·&nbsp; <span className="code-chip">{currentCount}/50 used</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-surface btn-sm" onClick={load}>Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              if (currentCount >= 50) alert('Limit reached. Delete an old election first.');
              else setShowLaunchPad(true);
            }}>+ Create Election</button>
          </div>
        </div>

        {/* GLOBAL PULSE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <KpiCard label="Total Enrollment" value={studentCount} sub="Across all workspaces" color="#4F46E5" spark={[30, 45, 32, 50, 42, 60, 55]} />
          <KpiCard label="Active Hubs" value={elections.filter(e => e.status === 'ACTIVE').length} sub="Live elections" color="#059669" trend="+12%" />
          <KpiCard label="Pending Action" value={pendingCount} sub="Student requests" color="#D97706" />
          <KpiCard label="System Health" value="99.9%" sub="All services active" color="#7C3AED" />
        </div>

        {/* SOVEREIGN INGESTION HUB (1, 2A, 2B) */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>Sovereign Ingestion Hub (Invite List)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #3B82F6', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 1: Sole Right</div>
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}>BLUE</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload the primary list of eligible emails.</p>
            <button className="btn btn-sm w-full" style={{ background: '#3B82F6', color: 'white' }} onClick={() => navigate('/admin/students')}>Manage Phase 1 →</button>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #DB2777', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 2A: Fixed Identity</div>
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#FDF2F8', color: '#9D174D', fontWeight: 700 }}>PINK</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload Profile IDs and Usernames.</p>
            <button className="btn btn-sm w-full" style={{ background: '#DB2777', color: 'white' }} onClick={() => navigate('/admin/students')}>Manage Phase 2A →</button>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)', borderTop: '4px solid #6366F1', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Phase 2B: Supplementary</div>
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 6, background: '#EEF2FF', color: '#4338CA', fontWeight: 700 }}>VIOLET</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>Upload metadata (Section, Department).</p>
            <button className="btn btn-sm w-full" style={{ background: '#6366F1', color: 'white' }} onClick={() => navigate('/admin/students')}>Manage Phase 2B →</button>
          </div>
        </div>

        {/* ELECTION GRID */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>Election Workspaces</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-surface btn-sm" style={{ padding: '4px 12px' }}>All</button>
            <button className="btn btn-surface btn-sm" style={{ padding: '4px 12px', opacity: 0.5 }}>Active</button>
            <button className="btn btn-surface btn-sm" style={{ padding: '4px 12px', opacity: 0.5 }}>Past</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 40 }}>
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 18 }} />)
          ) : elections.map(e => {
            const isSelected = selectedElection?.election_id === e.election_id;
            return (
              <Card key={e.election_id} style={{
                position: 'relative',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isSelected ? '0 12px 30px rgba(79, 70, 229, 0.15)' : 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <StatusPill status={e.status} />
                  <code style={{ fontSize: '0.65rem', color: 'var(--text-4)' }}>{e.election_code}</code>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{e.election_name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 16 }}>{e.semester_tag} &nbsp;·&nbsp; {e.student_count} Students</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
                  <Button variant={isSelected ? 'primary' : 'surface'} onClick={() => { selectElection(e); navigate('/admin/election'); }} style={{ width: '100%' }}>
                    {isSelected ? 'Managing Now' : 'Manage Election'}
                  </Button>
                  <Button variant="danger" onClick={() => setDeleting(e)} style={{ width: '100%', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', border: 'none' }}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}

          {!loading && elections.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', background: 'var(--bg-2)', borderRadius: 24, border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗳️</div>
              <h2 style={{ color: 'var(--text-2)' }}>No Elections Found</h2>
              <p style={{ color: 'var(--text-4)', marginBottom: 20 }}>Create your first election to start allocating courses.</p>
              <Button variant="primary" onClick={() => setShowLaunchPad(true)}>Create Election</Button>
            </div>
          )}
        </div>

        {/* STATS */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>Global Repository Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          <KpiCard label="Total Students" value={studentCount} sub="Verified records" color="#059669" onClick={() => navigate('/admin/students')} />
          <KpiCard label="Pending" value={pendingCount} sub="Registration requests" color="#D97706" onClick={() => navigate('/admin/pending')} />
          <KpiCard label="Elections" value={elections.length} sub="Out of 50 limit" color="#4F46E5" />
          <KpiCard label="Last Updated" value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} sub="Live feed" color="#7C3AED" />
        </div>
      </main>

      {/* LAUNCH PAD MODAL */}
      {showLaunchPad && (
        <LaunchPadModal
          onClose={() => setShowLaunchPad(false)}
          elections={elections}
          onCreated={handleCreated}
        />
      )}

      {/* DELETE MODAL */}
      {deleting && (
        <Modal title="Confirm Destructive Action" onClose={() => { setDeleting(null); setConfirmCode(''); setDelError(null); }}>
          <div style={{ padding: '4px' }}>
            <Alert type="error" style={{ marginBottom: 20 }}>
              <strong>Warning:</strong> This will permanently delete <b>{deleting.election_name}</b> and all associated data.
            </Alert>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 12 }}>
              Type the election code to confirm: <b style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{deleting.election_code}</b>
            </p>
            <Input placeholder="Enter election code..." value={confirmCode} onChange={e => setConfirmCode(e.target.value)} style={{ marginBottom: 12 }} />
            {delError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginBottom: 12, fontWeight: 600 }}>{delError}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="danger" onClick={handleDelete} disabled={delLoading || !confirmCode} style={{ flex: 1 }}>
                {delLoading ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </Button>
              <Button variant="surface" onClick={() => { setDeleting(null); setConfirmCode(''); }} style={{ flex: 1 }}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`.code-chip { background: var(--bg-2); padding: 2px 8px; border-radius: 6px; font-family: var(--mono); font-size: 0.75rem; color: var(--accent); border: 1px solid var(--border); }`}</style>
    </div>
  );
}

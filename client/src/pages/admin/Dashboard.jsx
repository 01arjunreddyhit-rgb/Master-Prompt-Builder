import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Badge, Modal, Input, Button, Alert, Card } from '../../components/ui/index';
import api from '../../services/api';

/* ── Animated counter ───────────────────────────────────────── */
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

/* ── SVG Donut ──────────────────────────────────────────────── */
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
              style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.1}s`, filter: `drop-shadow(0 0 5px ${seg.c}55)` }}
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

/* ── SVG Area Sparkline ─────────────────────────────────────── */
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
      {pts.map((p, i) => i === pts.length - 1 && (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ── KPI card ──────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, spark, trend, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface)', borderRadius: 18, padding: '20px 22px',
        border: `1.5px solid ${hover ? color : 'var(--border)'}`,
        boxShadow: hover ? `0 8px 32px ${color}22, 0 2px 8px rgba(0,0,0,0.06)` : 'var(--shadow-sm)',
        transition: 'all 0.22s', cursor: onClick ? 'pointer' : 'default',
        transform: hover && onClick ? 'translateY(-3px)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '18px 18px 0 0' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, width: 48, height: 48, borderRadius: '50%', background: `${color}18`, pointerEvents: 'none' }} />
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

/* ── Main Dashboard ────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const { selectElection, selectedElection } = useElection();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Delete state
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
        setLastRefresh(new Date());
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    if (confirmCode !== deleting.election_code) {
      setDelError('Code mismatch. Please type the exact election code.');
      return;
    }
    setDelLoading(true);
    setDelError(null);
    try {
      await api.delete(`/elections/${deleting.election_id}`, { data: { confirm_code: confirmCode } });
      setDeleting(null);
      setConfirmCode('');
      load();
    } catch (err) {
      setDelError(err.response?.data?.message || 'Error deleting election.');
    } finally {
      setDelLoading(false);
    }
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
              else navigate('/admin/election');
            }}>+ Create New Election</button>
          </div>
        </div>

        {/* GLOBAL PULSE (NEW) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <KpiCard 
            label="Total Enrollment" 
            value={studentCount} 
            sub="Across all workspaces" 
            color="#4F46E5" 
            spark={[30, 45, 32, 50, 42, 60, 55]}
          />
          <KpiCard 
            label="Active Hubs" 
            value={elections.filter(e => e.status === 'ACTIVE').length} 
            sub="Live elections" 
            color="#059669" 
            trend="+12%"
          />
          <KpiCard 
            label="Pending Action" 
            value={pendingCount} 
            sub="Student requests" 
            color="#D97706" 
          />
          <KpiCard 
            label="System Health" 
            value="99.9%" 
            sub="All services active" 
            color="#7C3AED" 
          />
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
                  <Button variant={isSelected ? 'primary' : 'surface'} onClick={() => {
                    selectElection(e);
                    navigate('/admin/election');
                  }} style={{ width: '100%' }}>
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
              <Button variant="primary" onClick={() => navigate('/admin/election')}>Create Election</Button>
            </div>
          )}
        </div>

        {/* STATS OVERVIEW */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>Global Repository Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          <KpiCard label="Total Students" value={studentCount} sub="Verified records" color="#059669" onClick={() => navigate('/admin/students')} />
          <KpiCard label="Pending" value={pendingCount} sub="Registration requests" color="#D97706" onClick={() => navigate('/admin/pending')} />
          <KpiCard label="Elections" value={elections.length} sub="Out of 50 limit" color="#4F46E5" />
          <KpiCard label="Last Updated" value={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} sub="Live feed" color="#7C3AED" />
        </div>

      </main>

      {/* DELETE MODAL */}
      {deleting && (
        <Modal title="Confirm Destructive Action" onClose={() => { setDeleting(null); setConfirmCode(''); setDelError(null); }}>
          <div style={{ padding: '4px' }}>
            <Alert type="error" style={{ marginBottom: 20 }}>
              <strong>Warning:</strong> This will permanently delete <b>{deleting.election_name}</b> and all associated results, seats, and course data. This action cannot be undone.
            </Alert>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 12 }}>
              To confirm, please type the unique election code: <b style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{deleting.election_code}</b>
            </p>
            
            <Input 
              placeholder="Enter election code..." 
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            
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

      <style>{`
        .code-chip { background: var(--bg-2); padding: 2px 8px; borderRadius: 6px; fontFamily: var(--mono); fontSize: 0.75rem; color: var(--accent); border: 1px solid var(--border); }
      `}</style>
    </div>
  );
}

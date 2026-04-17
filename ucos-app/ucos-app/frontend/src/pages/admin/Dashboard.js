import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Badge } from '../../components/ui/index';
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

/* ── Animated radial progress ───────────────────────────────── */
function RadialPct({ pct = 0, size = 72, color = '#4F46E5' }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '-0.5px' }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

/* ── Stacked horizontal bar ─────────────────────────────────── */
function StackBar({ rows = [], max }) {
  const m = max || Math.max(...rows.map(r => r.v), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: r.color || 'var(--accent)' }}>{r.v}</span>
          </div>
          <div style={{ height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${(r.v / m) * 100}%`,
              background: r.color || 'var(--accent)',
              transition: `width 0.8s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.08}s`,
              boxShadow: `0 0 8px ${(r.color || '#4F46E5')}44`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Activity pulse dot ─────────────────────────────────────── */
function PulseDot({ color = '#059669' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 9, height: 9, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.45, animation: 'pingDot 1.4s ease-out infinite' }} />
      <span style={{ borderRadius: '50%', width: '100%', height: '100%', background: color, display: 'block' }} />
    </span>
  );
}

/* ── KPI card with mini sparkline ───────────────────────────── */
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
      {/* top color strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '18px 18px 0 0' }} />
      {/* bg glow blob */}
      <div style={{ position: 'absolute', top: 10, right: 10, width: 48, height: 48, borderRadius: '50%', background: `${color}18`, pointerEvents: 'none' }} />

      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, color: 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.73rem', color: 'var(--text-4)' }}>{sub}</span>
        {trend !== undefined && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: trend >= 0 ? '#059669' : '#DC2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
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

/* ── Election timeline ──────────────────────────────────────── */
function ElectionTimeline({ elections = [], navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 24 }}>
      <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border)', borderRadius: 2 }} />
      {elections.slice(0, 5).map((e, i) => {
        const isCurrent = ['NOT_STARTED','ACTIVE','PAUSED'].includes(e.status);
        const color = e.status === 'ACTIVE' ? '#059669' : e.status === 'STOPPED' ? '#94A3B8' : e.status === 'PAUSED' ? '#D97706' : '#4F46E5';
        return (
          <div key={e.election_id} style={{ position: 'relative', marginBottom: 18 }}>
            <div style={{ position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: color, border: '2.5px solid var(--surface)', boxShadow: isCurrent ? `0 0 0 3px ${color}33, 0 0 12px ${color}44` : `0 0 0 2px ${color}22` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: isCurrent ? 'var(--text)' : 'var(--text-3)', lineHeight: 1.3 }}>{e.election_name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 2 }}>
                  {e.semester_tag && <span style={{ marginRight: 6 }}>{e.semester_tag}</span>}
                  {e.student_count != null && <span>{e.student_count} students</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <StatusPill status={e.status} />
                {e.status === 'STOPPED' && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => navigate(`/admin/allocation?id=${e.election_id}`)}>Results →</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {elections.length === 0 && <div style={{ fontSize: '0.84rem', color: 'var(--text-4)', paddingTop: 8 }}>No elections yet</div>}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [studentCount, setStudentCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  const current = elections.find(e => ['NOT_STARTED','ACTIVE','PAUSED'].includes(e.status));
  const past    = elections.filter(e => e.status === 'STOPPED');

  const studVal    = useCounter(studentCount ?? 0);
  const pendVal    = useCounter(pendingCount ?? 0);
  const elecVal    = useCounter(elections.length);
  const courseVal  = useCounter(current?.course_count ?? 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // election status donut
  const donutSegs = [
    { v: current?.student_count || 0, c: '#4F46E5', label: 'Students' },
    { v: current?.course_count || 0, c: '#059669', label: 'Courses' },
    { v: pendingCount || 0, c: '#D97706', label: 'Pending' },
  ].filter(s => s.v > 0);
  if (!donutSegs.length) donutSegs.push({ v: 1, c: '#E2E8F0', label: '' });

  const spark = [Math.floor((studentCount||0)*0.1), Math.floor((studentCount||0)*0.3),
    Math.floor((studentCount||0)*0.55), Math.floor((studentCount||0)*0.7),
    Math.floor((studentCount||0)*0.82), Math.floor((studentCount||0)*0.95), studentCount||0];

  const sectionDist = [
    { label: 'Section A', v: Math.floor((studentCount||0)*0.22), color: '#4F46E5' },
    { label: 'Section B', v: Math.floor((studentCount||0)*0.19), color: '#059669' },
    { label: 'Section C', v: Math.floor((studentCount||0)*0.21), color: '#D97706' },
    { label: 'Section D', v: Math.floor((studentCount||0)*0.20), color: '#7C3AED' },
    { label: 'Section E', v: Math.floor((studentCount||0)*0.18), color: '#DC2626' },
  ];

  const fillPct = current
    ? Math.round(((current.student_count || 0) / Math.max(current.faculty_count || 1, 1)) * 10)
    : 0;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 7 }}>
              {current?.status === 'ACTIVE' && <PulseDot />}
              {greeting}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', lineHeight: 1.2 }}>
              {user?.admin_name?.split(' ')[0]}'s Dashboard
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginTop: 4 }}>
              {user?.college_name} &nbsp;·&nbsp; <span className="code-chip">{user?.admin_id}</span>
              &nbsp;·&nbsp; <span style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {current && <StatusPill status={current.status} />}
            <button className="btn btn-surface btn-sm" onClick={load} style={{ gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total Students" value={loading ? '—' : studVal} sub="All time" color="#059669"
            spark={spark} onClick={() => navigate('/admin/students')} />
          <KpiCard label="Pending Approvals" value={loading ? '—' : pendVal}
            sub={pendingCount > 0 ? 'Needs review' : 'All clear'} color={pendingCount > 0 ? '#D97706' : '#059669'}
            onClick={() => navigate('/admin/pending')} />
          <KpiCard label="Active Courses" value={loading ? '—' : courseVal}
            sub={current?.election_name || 'No active election'} color="#4F46E5"
            onClick={() => navigate('/admin/courses')} />
          <KpiCard label="Elections Run" value={loading ? '—' : elecVal}
            sub={`${past.length} completed`} color="#7C3AED"
            onClick={() => navigate('/admin/election')} />
        </div>

        {/* ── MAIN 3-COL GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>

          {/* ── COL 1: Donut + distribution ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 20 }}>Election Snapshot</div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="skeleton" style={{ width: 110, height: 110, borderRadius: '50%' }} />
                  <div className="skeleton" style={{ width: 140, height: 14 }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Donut segments={donutSegs}
                    label={current ? current.student_count ?? 0 : '—'}
                    sub={current ? 'students' : 'no election'} />
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {donutSegs.filter(s => s.label).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.79rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 3, background: seg.c, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-3)' }}>{seg.label}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: seg.c }}>{seg.v}</span>
                      </div>
                    ))}
                    {pending && pendingCount > 0 && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: '#FFFBEB', borderRadius: 8, fontSize: '0.76rem', color: '#78350F', fontWeight: 600, border: '1px solid #FDE68A' }}>
                        ⚠ {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Completion radial */}
            {current && (
              <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '20px 22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 14 }}>Election Progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <RadialPct pct={Math.min(100, (current.course_count || 0) / Math.max(current.final_courses_per_student || 1, 1) * 20)} size={72} color="#4F46E5" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 4 }}>Courses per student</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>{current.final_courses_per_student}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 2 }}>required selections</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── COL 2: Active election panel ── */}
          <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>Active Election</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/election')} style={{ fontSize: '0.76rem' }}>Manage →</button>
            </div>

            {loading ? (
              [80,55,100,40].map((w,i) => <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, marginBottom: 8 }} />)
            ) : current ? (
              <>
                {/* Name + tags */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 8, lineHeight: 1.35 }}>{current.election_name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <StatusPill status={current.status} />
                    {current.semester_tag && <Badge variant="blue">{current.semester_tag}</Badge>}
                    {current.batch_tag && <Badge variant="grey">{current.batch_tag}</Badge>}
                  </div>
                </div>

                {/* Metric trio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Students', v: current.student_count ?? 0, color: '#4F46E5' },
                    { label: 'Courses',  v: current.course_count ?? 0,  color: '#059669' },
                    { label: 'Faculty',  v: current.faculty_count ?? 0, color: '#D97706' },
                  ].map(m => (
                    <div key={m.label} style={{ background: 'var(--muted-bg)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: m.color, letterSpacing: '-1px', lineHeight: 1 }}>{m.v}</div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Enrollment fill bar (visual) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Course enrollment heat</span>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{current.course_count || 0} courses</span>
                  </div>
                  {/* mini bar chart – each column = a conceptual course slot */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
                    {Array.from({ length: Math.max(current.course_count || 6, 6) }, (_, i) => {
                      const h = 20 + Math.sin(i * 1.7 + 1) * 18 + Math.cos(i * 0.9) * 10;
                      const c = h > 30 ? '#DC2626' : h > 22 ? '#D97706' : '#4F46E5';
                      return <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', background: `${c}88`, height: `${h}px`, transition: `height 0.6s ease ${i * 0.04}s` }} />;
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {current.status === 'NOT_STARTED' && <button className="btn btn-success btn-sm" onClick={() => navigate('/admin/election')}>▶ Start</button>}
                  {current.status === 'ACTIVE' && <button className="btn btn-warning btn-sm" onClick={() => navigate('/admin/election')}>⏸ Pause</button>}
                  {(current.status === 'ACTIVE' || current.status === 'PAUSED') && <button className="btn btn-danger btn-sm" onClick={() => navigate('/admin/election')}>⏹ Stop</button>}
                  {current.status === 'STOPPED' && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/allocation?id=${current.election_id}`)}>📊 Allocation →</button>}
                  <button className="btn btn-surface btn-sm" onClick={() => navigate('/admin/courses')}>Courses</button>
                  <button className="btn btn-surface btn-sm" onClick={() => navigate('/admin/students')}>Students</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0', gap: 12 }}>
                <div style={{ fontSize: '2.8rem', animation: 'float 3s ease-in-out infinite' }}>🗳️</div>
                <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>No active election</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-4)', maxWidth: 200 }}>Create one to get started with UCOS course allocation</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/election')}>Create Election →</button>
              </div>
            )}
          </div>

          {/* ── COL 3: Section distribution + quick actions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Section distribution */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 16 }}>Section Distribution</div>
              {loading ? (
                [90,75,85,70,80].map((w,i) => <div key={i} className="skeleton" style={{ height: 10, width: `${w}%`, marginBottom: 10 }} />)
              ) : studentCount > 0 ? (
                <StackBar rows={sectionDist} />
              ) : (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-4)', textAlign: 'center', padding: '16px 0' }}>No students yet</div>
              )}
            </div>

            {/* Student growth sparkline */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>Enrollment Trend</div>
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>↑ Growth</span>
              </div>
              <AreaLine data={spark} color="#059669" h={52} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-4)', marginTop: 6 }}>
                <span>Start</span><span>Mid</span><span>Now</span>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '20px 22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 14 }}>Quick Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '⬆', label: 'Upload CSV', path: '/admin/students', color: '#4F46E5' },
                  { icon: '📚', label: 'Add Course', path: '/admin/courses', color: '#059669' },
                  { icon: '🗳', label: 'Election', path: '/admin/election', color: '#0A0F1E' },
                  { icon: '⏳', label: 'Pending', path: '/admin/pending', color: pendingCount > 0 ? '#D97706' : '#94A3B8', badge: pendingCount > 0 ? pendingCount : null },
                  { icon: '📊', label: 'Allocation', path: '/admin/allocation', color: '#7C3AED' },
                  { icon: '👤', label: 'Profile', path: '/admin/profile', color: '#64748B' },
                ].map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderRadius: 10, border: `1.5px solid ${a.color}22`, background: `${a.color}08`, color: a.color, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', textAlign: 'left', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.background=`${a.color}18`; e.currentTarget.style.borderColor=`${a.color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.background=`${a.color}08`; e.currentTarget.style.borderColor=`${a.color}22`; }}>
                    <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                    {a.label}
                    {a.badge && <span style={{ marginLeft: 'auto', background: '#D97706', color: 'white', fontSize: '0.58rem', padding: '1px 5px', borderRadius: 99, fontWeight: 700 }}>{a.badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ELECTION TIMELINE ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>Election History</div>
            <Badge variant="grey">{elections.length} total</Badge>
          </div>
          <ElectionTimeline elections={elections} navigate={navigate} />
        </div>

      </main>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pingDot { 0%{transform:scale(1);opacity:0.45} 75%,100%{transform:scale(2.2);opacity:0} }
      `}</style>
    </div>
  );
}

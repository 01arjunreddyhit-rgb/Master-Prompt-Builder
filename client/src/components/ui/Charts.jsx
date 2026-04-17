import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────────────────────── */
export function AnimCounter({ value, duration = 900, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = value ?? 0;
    prev.current = to;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setDisplay(parseFloat((from + (to - from) * ease).toFixed(decimals)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration, decimals]);
  return <>{prefix}{typeof display === 'number' ? display.toLocaleString() : display}{suffix}</>;
}

/* ─────────────────────────────────────────────────────────────
   RADIAL GAUGE
───────────────────────────────────────────────────────────── */
export function RadialGauge({ value = 0, max = 100, size = 120, stroke = 10, color = '#4F46E5', bg = '#E2E8F0', label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(max, 1));
  const dash = pct * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {label && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size < 90 ? '0.9rem' : '1.2rem', letterSpacing: '-0.5px', lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AREA SPARKLINE (SVG)
───────────────────────────────────────────────────────────── */
export function AreaSparkline({ data = [], color = '#4F46E5', height = 56, showDots = false }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 200, H = height;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 8) - 4,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;
  const gradId = `sg-${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? color : 'white'} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   DONUT CHART (multi-segment)
───────────────────────────────────────────────────────────── */
export function DonutChart({ segments = [], size = 100, stroke = 14, label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const arc = { offset, dash: pct * circ, color: seg.color, label: seg.label };
    offset += pct * circ;
    return arc;
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* background ring */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
            strokeDashoffset={-(arc.offset)}
            strokeLinecap="butt"
            style={{ transition: `stroke-dasharray 0.7s ease ${i * 0.1}s`, filter: `drop-shadow(0 0 4px ${arc.color}55)` }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {label !== undefined && <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size < 80 ? '0.85rem' : '1.1rem', letterSpacing: '-0.5px', lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '0.6rem', color: 'var(--text-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HORIZONTAL BAR CHART
───────────────────────────────────────────────────────────── */
export function HBarChart({ rows = [], max: propMax }) {
  const max = propMax ?? Math.max(...rows.map(r => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, i) => {
        const pct = Math.min(100, (row.value / max) * 100);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: row.color || 'var(--accent)' }}>{row.value}</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, width: `${pct}%`,
                background: row.color || 'var(--accent)',
                transition: `width 0.7s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.06}s`,
                boxShadow: `0 0 8px ${(row.color || '#4F46E5')}55`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WATERFALL / STACKED BAR (per course allocation)
───────────────────────────────────────────────────────────── */
export function StackedBar({ confirmed = 0, booked = 0, burst = 0, unused = 0, total = 1, height = 12 }) {
  const safe = total || 1;
  const segs = [
    { val: confirmed, color: '#059669' },
    { val: booked,    color: '#4F46E5' },
    { val: burst,     color: '#DC2626' },
    { val: unused,    color: '#E2E8F0' },
  ];
  return (
    <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', width: '100%' }}>
      {segs.map((s, i) => (
        <div key={i} style={{
          width: `${(s.val / safe) * 100}%`, height: '100%', background: s.color,
          transition: `width 0.7s ease ${i * 0.08}s`, minWidth: s.val > 0 ? 3 : 0,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SEAT GRID (interactive mini seat map)
───────────────────────────────────────────────────────────── */
export function SeatGrid({ total = 0, occupied = 0, confirmed = 0, size = 10 }) {
  const [hover, setHover] = useState(null);
  const cells = Array.from({ length: Math.min(total, 120) }, (_, i) => {
    if (i < confirmed) return 'confirmed';
    if (i < occupied)  return 'occupied';
    return 'free';
  });
  const colors = { confirmed: '#059669', occupied: '#4F46E5', free: '#E2E8F0' };
  const labels = { confirmed: 'Confirmed', occupied: 'Booked', free: 'Available' };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
        {cells.map((state, i) => (
          <div key={i}
            onMouseEnter={() => setHover({ i, state })}
            onMouseLeave={() => setHover(null)}
            style={{
              width: size, height: size, borderRadius: 2,
              background: colors[state],
              opacity: hover && hover.i !== i ? 0.6 : 1,
              transition: 'opacity 0.12s, transform 0.12s',
              transform: hover?.i === i ? 'scale(1.4)' : 'scale(1)',
              cursor: 'default',
              boxShadow: hover?.i === i ? `0 0 6px ${colors[state]}` : 'none',
              animationDelay: `${i * 8}ms`,
            }}
          />
        ))}
        {total > 120 && (
          <div style={{ width: size, height: size, borderRadius: 2, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'var(--text-4)' }}>+</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: '0.7rem' }}>
        {Object.entries(colors).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ color: 'var(--text-3)' }}>{labels[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WAVE ANIMATION (token flow visualization)
───────────────────────────────────────────────────────────── */
export function WaveBar({ value = 0, max = 100, color = '#4F46E5', height = 48, label }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  const waveId = `wave-${Math.random().toString(36).slice(2,7)}`;
  return (
    <div style={{ position: 'relative', height, borderRadius: 10, overflow: 'hidden', background: '#E2E8F0' }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${pct}%`, background: color,
        transition: 'height 0.8s cubic-bezier(0.34,1.2,0.64,1)',
        minHeight: value > 0 ? 4 : 0,
      }}>
        <svg viewBox="0 0 200 20" preserveAspectRatio="none" style={{ position: 'absolute', top: -10, left: 0, right: 0, width: '100%', height: 20 }}>
          <path d="M0,10 C40,0 80,20 120,10 C160,0 180,20 200,10 L200,20 L0,20 Z" fill={color}>
            <animateTransform attributeName="transform" type="translate" from="0,0" to="-100,0" dur="2s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: pct > 50 ? 'white' : 'var(--text-3)' }}>
          {label}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIVE ACTIVITY FEED ITEM
───────────────────────────────────────────────────────────── */
export function ActivityFeed({ items = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
          borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
          animation: `slideUp 0.3s ease ${i * 0.05}s both`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: `${item.color || '#4F46E5'}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0,
            border: `1px solid ${item.color || '#4F46E5'}33`,
          }}>{item.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{item.title}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-4)' }}>{item.sub}</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{item.time}</div>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-4)', fontSize: '0.84rem' }}>No activity yet</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TOKEN FLOW DIAGRAM (horizontal pipeline)
───────────────────────────────────────────────────────────── */
export function TokenFlow({ tokens = [] }) {
  if (!tokens.length) return null;
  const STATUS_COLOR = {
    UNUSED: '#94A3B8', BOOKED: '#4F46E5', CONFIRMED: '#059669', BURST: '#DC2626', AUTO: '#7C3AED',
  };
  const STATUS_LABEL = { UNUSED: 'Unused', BOOKED: 'Booked', CONFIRMED: 'Confirmed', BURST: 'Burst', AUTO: 'Auto' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
      {tokens.map((t, i) => {
        const color = STATUS_COLOR[t.status] || '#94A3B8';
        return (
          <React.Fragment key={t.token_id || i}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: `${color}18`,
                border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.78rem', color,
                boxShadow: t.status !== 'UNUSED' ? `0 0 12px ${color}44` : 'none',
                transition: 'all 0.3s',
              }}>T{t.token_number}</div>
              <div style={{ fontSize: '0.58rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {STATUS_LABEL[t.status] || t.status}
              </div>
              {t.course_name && (
                <div style={{ fontSize: '0.55rem', color: 'var(--text-4)', maxWidth: 60, textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {t.course_name}
                </div>
              )}
            </div>
            {i < tokens.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 2px', marginBottom: 30 }}>
                <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
                  <path d="M0,5 L18,5" stroke="var(--border-2)" strokeWidth="1.5" strokeDasharray="3,2" />
                  <path d="M16,2 L22,5 L16,8" stroke="var(--border-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CIRCULAR PROGRESS RING (small, inline)
───────────────────────────────────────────────────────────── */
export function MiniRing({ value = 0, max = 100, size = 36, color = '#4F46E5' }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(max, 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   DEMAND HEATMAP (2D grid of course demand per section)
───────────────────────────────────────────────────────────── */
export function DemandHeatmap({ courses = [], sections = ['A','B','C','D','E'], getData }) {
  if (!courses.length) return null;
  const maxVal = 30;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: '0.7rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-4)', fontWeight: 600 }}>Course</th>
            {sections.map(s => (
              <th key={s} style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--text-4)', fontWeight: 600, minWidth: 40 }}>Sec {s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.slice(0, 8).map((c, ci) => (
            <tr key={ci}>
              <td style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.course_name}
              </td>
              {sections.map(s => {
                const val = getData ? getData(c, s) : Math.floor(Math.random() * maxVal);
                const intensity = val / maxVal;
                const alpha = Math.round(intensity * 200).toString(16).padStart(2, '0');
                return (
                  <td key={s} title={`${c.course_name} · Sec ${s}: ${val}`} style={{
                    padding: 0, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 40, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: intensity > 0.01 ? `#4F46E5${alpha}` : 'var(--muted-bg)',
                      borderRadius: 6, fontFamily: 'var(--mono)', fontWeight: 700,
                      color: intensity > 0.5 ? 'white' : 'var(--text-3)',
                      fontSize: '0.68rem', cursor: 'default',
                      transition: 'background 0.3s',
                    }}>
                      {val > 0 ? val : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PULSE BEACON (live indicator)
───────────────────────────────────────────────────────────── */
export function PulseBeacon({ color = '#059669', size = 10 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color,
        opacity: 0.4, animation: 'beaconPing 1.4s ease-out infinite',
      }} />
      <span style={{ borderRadius: '50%', width: '100%', height: '100%', background: color, display: 'block' }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   TREND ARROW
───────────────────────────────────────────────────────────── */
export function TrendArrow({ value, prev }) {
  if (prev === undefined || prev === null) return null;
  const up = value >= prev;
  const same = value === prev;
  if (same) return <span style={{ color: 'var(--text-4)', fontSize: '0.72rem' }}>—</span>;
  return (
    <span style={{ color: up ? '#059669' : '#DC2626', fontSize: '0.72rem', fontWeight: 700 }}>
      {up ? '↑' : '↓'} {Math.abs(value - prev)}
    </span>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── animated counter ─────────────────────────────────────── */
function Counter({ target, suffix = '', duration = 1600 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(ease * target));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── floating orb ─────────────────────────────────────────── */
function Orb({ cx, cy, r, color, delay = 0 }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill={color}
      style={{ animation: `orbFloat 6s ease-in-out ${delay}s infinite alternate` }}
    />
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2800);
    return () => clearInterval(id);
  }, []);

  const steps = [
    { icon: '🏫', title: 'Admin Sets Up',   desc: 'Creates election, adds courses, uploads students via CSV' },
    { icon: '🎫', title: 'Tokens Issued',   desc: 'Each student gets N tokens — one per elective slot' },
    { icon: '⚡', title: 'Students Opt',    desc: 'Click OPT to secure seats in real-time (FCFS)' },
    { icon: '📊', title: 'Admin Allocates', desc: 'Confirm / burst courses via PWFCFS-MRA rounds' },
    { icon: '✅', title: 'Results Published', desc: 'Final seats confirmed, emails sent, CSV exported' },
  ];

  const features = [
    { label: 'ACID-safe FCFS', sub: 'Row-level locks prevent double-booking' },
    { label: 'Token Priority', sub: 'T1 > T2 > T3 preference system' },
    { label: 'PWFCFS-MRA', sub: 'Multi-round allocation algorithm' },
    { label: 'Real-time', sub: '15s auto-refresh during elections' },
    { label: 'CSV Import/Export', sub: 'Bulk student upload & result download' },
    { label: 'Email Results', sub: 'Auto-sends final allocation to students' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#07091A', color: 'white', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── TOP NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 48px', position: 'relative', zIndex: 10 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
          UC<span style={{ color: '#818CF8' }}>OS</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/admin/login')}
            style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.borderColor = '#818CF8'; e.target.style.color = 'white'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'rgba(255,255,255,0.75)'; }}>
            Admin
          </button>
          <button onClick={() => navigate('/login')}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: '#4F46E5', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 2px 12px rgba(79,70,229,0.4)' }}>
            Student Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', padding: '80px 48px 100px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        {/* Background SVG orbs */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 900 600">
          <defs>
            <radialGradient id="g1"><stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35"/><stop offset="100%" stopColor="#4F46E5" stopOpacity="0"/></radialGradient>
            <radialGradient id="g2"><stop offset="0%" stopColor="#059669" stopOpacity="0.2"/><stop offset="100%" stopColor="#059669" stopOpacity="0"/></radialGradient>
            <style>{`@keyframes orbFloat { 0%{transform:translateY(0)} 100%{transform:translateY(-18px)} }`}</style>
          </defs>
          <Orb cx={180} cy={200} r={200} color="url(#g1)" delay={0} />
          <Orb cx={720} cy={350} r={180} color="url(#g2)" delay={1.5} />
        </svg>

        {/* Badge */}
        <div style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.35)', borderRadius: 99, padding: '6px 16px', marginBottom: 32, fontSize: '0.78rem', fontWeight: 600, color: '#A5B4FC' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', display: 'inline-block', animation: 'pulse 1.4s ease infinite' }} />
          Fair · Transparent · Bias-Free Course Allocation
        </div>

        <h1 style={{ position: 'relative', zIndex: 1, fontFamily: "'Syne', sans-serif", fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-2px', marginBottom: 24 }}>
          Making&nbsp;<em style={{ color: '#818CF8', fontStyle: 'normal' }}>Elective</em><br />
          truly mean Elective.
        </h1>
        <p style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.55)', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.7 }}>
          A weighted first-come first-served platform for elective course selection — built on individual preference, not group majority.
        </p>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
          <button onClick={() => navigate('/admin/login')}
            style={{ padding: '14px 36px', borderRadius: 12, border: 'none', background: 'white', color: '#0A0F1E', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.target.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.target.style.transform='translateY(0)'}>
            Admin Login →
          </button>
          <button onClick={() => navigate('/login')}
            style={{ padding: '14px 36px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background='rgba(255,255,255,0.06)'; e.target.style.borderColor='rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.target.style.background='transparent'; e.target.style.borderColor='rgba(255,255,255,0.15)'; }}>
            Student Portal
          </button>
        </div>

        {/* Animated stat counters */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, maxWidth: 540, margin: '0 auto', background: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { target: 99, suffix: '%', label: 'Zero Double-Bookings' },
            { target: 3, suffix: 'x', label: 'Faster than manual' },
            { target: 100, suffix: '%', label: 'Student-first priority' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '22px 16px', textAlign: 'center', background: i === 1 ? 'rgba(79,70,229,0.12)' : 'transparent', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>
                <Counter target={s.target} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Five steps to fair allocation</h2>
          </div>

          <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
            {/* connector line */}
            <div style={{ position: 'absolute', top: 28, left: '10%', right: '10%', height: 2, background: 'linear-gradient(90deg, rgba(79,70,229,0.6), rgba(5,150,105,0.6))', borderRadius: 2, zIndex: 0 }} />
            {steps.map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 10px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: i <= tick % steps.length ? 'linear-gradient(135deg, #4F46E5, #818CF8)' : 'rgba(255,255,255,0.06)',
                  border: i === tick % steps.length ? '2px solid #818CF8' : '2px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', transition: 'all 0.6s ease',
                  boxShadow: i === tick % steps.length ? '0 0 20px rgba(79,70,229,0.5)' : 'none',
                }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 5, color: i === tick % steps.length ? 'white' : 'rgba(255,255,255,0.6)' }}>{s.title}</div>
                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Built Different</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Everything you need</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i}
                style={{ padding: '22px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(79,70,229,0.08)'; e.currentTarget.style.borderColor='rgba(79,70,229,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: '60px 48px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: '44px', borderRadius: 24, border: '1px solid rgba(79,70,229,0.25)', background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(99,102,241,0.05))' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.6rem', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>Ready to run your election?</div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.6 }}>Set up in minutes. Fair results, every time.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/admin/register')}
              style={{ padding: '12px 30px', borderRadius: 11, border: 'none', background: '#4F46E5', color: 'white', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
              Get Started →
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding: '12px 30px', borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Student Login
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 48px 36px', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        UCOS v2.0 · CSE Dept · 2026 · Built with PWFCFS-MRA
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

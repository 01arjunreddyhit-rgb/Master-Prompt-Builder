import React, { useState, useEffect } from 'react';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Badge, Spinner, EmptyState } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/* ── Confetti burst ───────────────────────────────────────── */
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.2 + Math.random() * 1,
    color: ['#4F46E5','#059669','#D97706','#7C3AED','#818CF8','#10B981'][i % 6],
    size: 5 + Math.random() * 6,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: '-10px',
          width: p.size, height: p.size, borderRadius: 2,
          background: p.color, opacity: 0,
          animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%  { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100%{ transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Result Card ──────────────────────────────────────────── */
function ResultCard({ result, index, visible }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 18, border: '1.5px solid var(--border)',
      overflow: 'hidden', transition: `all 0.5s ease ${index * 0.12}s`,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Colored top */}
      <div style={{
        background: `linear-gradient(135deg, ${index === 0 ? '#4F46E5,#6366F1' : index === 1 ? '#059669,#10B981' : '#7C3AED,#A78BFA'})`,
        padding: '20px 22px', color: 'white',
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.75, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 5 }}>
          Course {index + 1} &nbsp;·&nbsp; {result.subject_code || '—'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {result.course_name}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 4 }}>
          {result.credit_weight} credits
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '18px 22px' }}>
        {[
          { label: 'Seat Number', value: result.seat_code, mono: true, highlight: true },
          { label: 'Token Used',  value: result.token_code, mono: true },
          { label: 'Confirmed in', value: result.is_auto_assigned ? 'Auto-assigned' : `Round ${result.round_confirmed}` },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 0', borderBottom: '1px solid var(--border)',
            fontSize: '0.85rem',
          }}>
            <span style={{ color: 'var(--text-3)' }}>{row.label}</span>
            <span style={{
              fontFamily: row.mono ? 'var(--mono)' : 'var(--font)',
              fontWeight: 700, fontSize: row.mono ? '0.82rem' : '0.85rem',
              color: row.highlight ? 'var(--accent)' : 'var(--text)',
              background: row.highlight ? 'var(--accent-light)' : 'transparent',
              padding: row.highlight ? '2px 10px' : '0',
              borderRadius: row.highlight ? 6 : 0,
            }}>
              {row.value}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Badge variant={result.is_auto_assigned ? 'purple' : 'green'}>
            {result.is_auto_assigned ? 'Auto-assigned' : 'Self (FCFS)'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    api.get('/student/results')
      .then(r => {
        const data = r.data.data || [];
        setResults(data);
        if (data.length > 0) {
          setTimeout(() => { setVisible(true); setShowConfetti(true); }, 100);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        {showConfetti && <Confetti />}

        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">My Results</h1>
            <p className="page-subtitle">Final confirmed course allocation</p>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--emerald-light)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '8px 16px' }}>
              <span style={{ fontSize: '1.2rem' }}>🎉</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#065F46' }}>Allocation Complete</div>
                <div style={{ fontSize: '0.72rem', color: '#047857' }}>{results.length} courses confirmed</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : results.length === 0 ? (
          <div>
            <EmptyState icon="📊" title="No results yet"
              message="Your results will appear here after the admin completes allocation rounds." />
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: '2rem' }}>⏳</div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Waiting for allocation</div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>
                    The admin runs allocation rounds after the election closes. Each round confirms or bursts courses based on demand.
                    Check back after the election ends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0A0F1E, #1C2537)',
              borderRadius: 18, padding: '24px 28px', marginBottom: 28, color: 'white',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.4px' }}>
                  Allocation Finalised ✓
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: 4 }}>
                  {user?.full_student_id} &nbsp;·&nbsp; Section {user?.section}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>{results.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Courses</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
                    {results.reduce((sum, r) => sum + (parseFloat(r.credit_weight) || 0), 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Credits</div>
                </div>
              </div>
            </div>

            {/* Result Cards */}
            <div className="course-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))' }}>
              {results.map((r, i) => (
                <ResultCard key={i} result={r} index={i} visible={visible} />
              ))}
            </div>

            {/* Detail table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Allocation Detail</span>
                <span className="text-xs text-muted">{user?.full_student_id} · Section {user?.section}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Course</th><th>Code</th><th>Seat</th><th>Token</th><th>Round</th><th>Method</th></tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td><strong style={{ color: 'var(--text)' }}>{i + 1}</strong></td>
                        <td><strong style={{ color: 'var(--text)' }}>{r.course_name}</strong></td>
                        <td><span className="code-chip">{r.subject_code || '—'}</span></td>
                        <td><span className="code-chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent-3)' }}>{r.seat_code}</span></td>
                        <td><span className="code-chip">{r.token_code}</span></td>
                        <td>{r.round_confirmed || <span className="badge badge-purple">AUTO</span>}</td>
                        <td>
                          <Badge variant={r.is_auto_assigned ? 'purple' : 'green'}>
                            {r.is_auto_assigned ? 'Auto' : 'Self'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

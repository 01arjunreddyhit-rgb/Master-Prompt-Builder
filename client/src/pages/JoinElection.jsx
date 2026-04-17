import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function StatusDot({ status }) {
  const map = {
    ACTIVE:      { color: '#059669', label: 'Active' },
    PAUSED:      { color: '#D97706', label: 'Paused' },
    STOPPED:     { color: '#DC2626', label: 'Closed' },
    NOT_STARTED: { color: '#94A3B8', label: 'Not Started' },
  };
  const s = map[status] || map.NOT_STARTED;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 99, background: `${s.color}18`, border: `1px solid ${s.color}44`, fontSize: '0.78rem', fontWeight: 700, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block', animation: status === 'ACTIVE' ? 'dotPulse 1.4s ease infinite' : 'none' }} />
      {s.label}
    </span>
  );
}

export default function JoinElection() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [expired, setExpired] = useState(false);

  // Apply flow
  const [email, setEmail]           = useState(user?.email || '');
  const [applying, setApplying]     = useState(false);
  const [applyMsg, setApplyMsg]     = useState('');
  const [applyError, setApplyError] = useState('');
  const [applied, setApplied]       = useState(false);

  useEffect(() => {
    api.get(`/join/${code}`)
      .then(r => setData(r.data))
      .catch(err => {
        if (err.response?.data?.expired) setExpired(true);
        else setError(err.response?.data?.message || 'Invalid election code.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  const handleApply = async () => {
    if (!user) return navigate(`/login?redirect=/join/${code}`);
    if (!email) return setApplyError('Email required.');
    setApplying(true); setApplyError('');
    try {
      const { data: res } = await api.post('/cav/apply', { code, email });
      setApplyMsg(res.message);
      setApplied(true);
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Application failed.');
    } finally { setApplying(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
      <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white', width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  if (expired) return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '44px 40px', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏰</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8 }}>Link Expired</h2>
        <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>This election link has expired. The election is now closed.</p>
        <button className="btn btn-surface" onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '44px 40px', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8 }}>Not Found</h2>
        <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>{error}</p>
        <button className="btn btn-surface" onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );

  const { election, participants = [], field_config = {} } = data;
  const confirmed = participants.filter(p => p.status === 'CONFIRMED');
  const pending   = participants.filter(p => p.status === 'PENDING');

  const showSection  = field_config.section         === 'public';
  const showRegNo    = field_config.register_number  === 'public';
  const showEmail    = field_config.email            === 'public';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', fontFamily: 'var(--font)', overflowX: 'hidden' }}>
      {/* bg glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(79,70,229,0.28) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '56px 56px', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'white', letterSpacing: '-0.3px' }}>
          UC<span style={{ color: '#818CF8' }}>OS</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user ? (
            <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)' }}>Logged in as <strong style={{ color: 'white' }}>{user.name || user.admin_name}</strong></span>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/login?redirect=/join/${code}`)}>Login to Apply</button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* Election hero */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontFamily: 'var(--mono)', fontSize: '0.72rem', background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)', borderRadius: 8, padding: '5px 14px', color: '#818CF8', marginBottom: 18, letterSpacing: '2px' }}>
            CODE: {code}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', color: 'white', letterSpacing: '-1px', marginBottom: 12, lineHeight: 1.2 }}>
            {election.election_name}
          </h1>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <StatusDot status={election.status} />
            {election.semester_tag && <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', padding: '4px 12px', borderRadius: 99 }}>{election.semester_tag}</span>}
            {election.batch_tag && <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', padding: '4px 12px', borderRadius: 99 }}>{election.batch_tag}</span>}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            {election.college_name} &nbsp;·&nbsp; Conducted by {election.admin_name}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* ── Participant list ── */}
          <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>Participants</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: '0.7rem', background: 'rgba(5,150,105,0.2)', color: '#34D399', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>{confirmed.length} confirmed</span>
                {pending.length > 0 && <span style={{ fontSize: '0.7rem', background: 'rgba(217,119,6,0.2)', color: '#FCD34D', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>{pending.length} pending</span>}
              </div>
            </div>

            {participants.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>👥</div>
                <div style={{ fontSize: '0.88rem' }}>No participants yet. Be the first!</div>
              </div>
            ) : (
              <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                {/* Confirmed first */}
                {confirmed.map((p, i) => (
                  <div key={p.participant_id} style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14, animation: `slideUp 0.3s ease ${i * 0.04}s both` }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>
                      {p.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>{p.display_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, display:'flex', gap:8, flexWrap:'wrap' }}>
                        {showSection    && <span>Sec {p.section}</span>}
                        {showRegNo      && <span>{p.register_number}</span>}
                        {showEmail      && <span>{p.email}</span>}
                        <span>Applied {new Date(p.applied_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.66rem', background: 'rgba(5,150,105,0.2)', color: '#34D399', padding: '3px 9px', borderRadius: 99, fontWeight: 700 }}>✓ IN</span>
                  </div>
                ))}
                {/* Pending */}
                {pending.map((p, i) => (
                  <div key={p.participant_id} style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14, opacity: 0.6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                      {p.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>{p.display_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Pending admin review</div>
                    </div>
                    <span style={{ fontSize: '0.66rem', background: 'rgba(217,119,6,0.2)', color: '#FCD34D', padding: '3px 9px', borderRadius: 99, fontWeight: 700 }}>⏳</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Apply panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stats */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Participants', v: participants.length, color: '#818CF8' },
                { label: 'Confirmed', v: confirmed.length, color: '#34D399' },
                { label: 'Courses/Student', v: election.final_courses_per_student, color: '#FCD34D' },
                { label: 'Status', v: election.status.replace('_',' '), color: '#94A3B8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Apply form */}
            {applied ? (
              <div style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.35)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 700, color: '#34D399', marginBottom: 6 }}>Application Submitted!</div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{applyMsg}</p>
                {user?.role === 'student' && (
                  <button className="btn btn-success" style={{ marginTop: 16, width: '100%' }} onClick={() => navigate('/student')}>Go to My Dashboard</button>
                )}
              </div>
            ) : election.status === 'STOPPED' ? (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔒</div>
                <div style={{ fontWeight: 700, color: '#FCA5A5', marginBottom: 6 }}>Election Closed</div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>This election is no longer accepting applications.</p>
              </div>
            ) : !user ? (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>🔑</div>
                <div style={{ fontWeight: 700, color: 'white', marginBottom: 8 }}>Login to Apply</div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: 18, lineHeight: 1.6 }}>You need to be logged in as a student to apply for this election.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/login?redirect=/join/${code}`)}>Student Login</button>
                  <button className="btn btn-surface" style={{ width: '100%' }} onClick={() => navigate(`/student/register`)}>Create Account</button>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}>
                <div style={{ fontWeight: 700, color: 'white', marginBottom: 4, fontSize: '1rem' }}>Apply for this Election</div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 1.6 }}>
                  Your email must match your registered account. Only one application per election is allowed.
                </p>

                {applyError && (
                  <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: '#FCA5A5' }}>
                    {applyError}
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Confirm Your Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '0.9rem', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor='#818CF8'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.15)'} />
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                    Must match: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{user.email}</strong>
                  </div>
                </div>

                <button onClick={handleApply} disabled={applying}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: applying ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: applying ? 0.7 : 1, boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                  {applying ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Applying…</> : '✋ Apply for Election'}
                </button>

                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: '0.74rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  After applying, the admin will review your credentials and confirm your participation. You'll receive a notification.
                </div>
              </div>
            )}

            <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font)', padding: '6px 0' }}
              onClick={() => navigate('/')}>← Back to UCOS Home</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,0.5)} 50%{box-shadow:0 0 0 5px rgba(5,150,105,0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { StatusPill, Alert, Spinner, Modal } from '../../components/ui/index';
import api from '../../services/api';

/* ── Seat urgency ───────────────────────────────────────────── */
function urgency(avail, total) {
  if (!total) return { color: '#94A3B8', label: '—', pct: 0 };
  const pct = avail / total;
  if (pct > 0.5) return { color: '#059669', label: 'Available', pct };
  if (pct > 0.2) return { color: '#D97706', label: 'Filling up!', pct };
  if (pct > 0)   return { color: '#DC2626', label: '🔥 Almost full', pct };
  return { color: '#DC2626', label: 'Full', pct: 0 };
}

/* ── Animated seat grid ─────────────────────────────────────── */
function SeatGrid({ total = 0, available = 0, myBooked = false }) {
  const occupied = total - available;
  const MAX_SHOW = 80;
  const cells = Array.from({ length: Math.min(total, MAX_SHOW) }, (_, i) => {
    if (i < occupied) return 'taken';
    return 'free';
  });
  const [hov, setHov] = useState(null);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
        {cells.map((state, i) => {
          const isMe = myBooked && state === 'taken' && i === 0;
          const col = isMe ? '#4F46E5' : state === 'taken' ? '#DC2626' : '#E2E8F0';
          return (
            <div key={i}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                width: 10, height: 10, borderRadius: 2, background: col,
                transform: hov === i ? 'scale(1.6)' : 'scale(1)',
                transition: 'transform 0.12s, box-shadow 0.12s',
                boxShadow: hov === i ? `0 0 6px ${col}` : 'none',
                cursor: 'default',
              }}
            />
          );
        })}
        {total > MAX_SHOW && (
          <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', alignSelf: 'center', marginLeft: 4 }}>+{total - MAX_SHOW} more</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-4)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#E2E8F0', display: 'inline-block' }} /> Free</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#DC2626', display: 'inline-block' }} /> Taken</span>
        {myBooked && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#4F46E5', display: 'inline-block' }} /> Yours</span>}
      </div>
    </div>
  );
}

/* ── Token pipeline ─────────────────────────────────────────── */
function TokenPipeline({ tokens = [], nextToken }) {
  const STATUS_COL = { UNUSED: '#E2E8F0', BOOKED: '#4F46E5', CONFIRMED: '#059669', BURST: '#DC2626', AUTO: '#7C3AED' };
  const STATUS_LABEL = { UNUSED: 'idle', BOOKED: 'booked', CONFIRMED: 'confirmed', BURST: 'burst', AUTO: 'auto' };
  const STATUS_TEXT = { UNUSED: '#94A3B8', BOOKED: 'white', CONFIRMED: 'white', BURST: 'white', AUTO: 'white' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
      {tokens.map((t, i) => {
        const isNext = t.token_id === nextToken?.token_id;
        const col = STATUS_COL[t.status] || '#E2E8F0';
        const textCol = isNext ? 'white' : STATUS_TEXT[t.status] || '#94A3B8';
        return (
          <React.Fragment key={t.token_id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, minWidth: 56 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                background: isNext ? 'linear-gradient(135deg, #4F46E5, #818CF8)' : `${col}${t.status === 'UNUSED' ? '' : 'FF'}`,
                border: `2px solid ${isNext ? '#818CF8' : col}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '0.82rem', color: textCol,
                boxShadow: isNext ? '0 4px 16px rgba(79,70,229,0.5)' : t.status !== 'UNUSED' ? `0 2px 8px ${col}55` : 'none',
                animation: isNext ? 'tokenPulse 2s ease infinite' : 'none',
              }}>T{t.token_number}</div>
              <div style={{ fontSize: '0.57rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: isNext ? '#4F46E5' : col === '#E2E8F0' ? '#94A3B8' : col, textAlign: 'center' }}>
                {isNext ? 'NEXT' : STATUS_LABEL[t.status] || t.status}
              </div>
              {t.course_name && (
                <div style={{ fontSize: '0.54rem', color: 'var(--text-4)', maxWidth: 54, textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {t.course_name}
                </div>
              )}
            </div>
            {i < tokens.length - 1 && (
              <div style={{ alignSelf: 'center', marginBottom: 28, padding: '0 2px', flexShrink: 0 }}>
                <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                  <path d="M0,4 L14,4" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2" />
                  <path d="M12,1.5 L17,4 L12,6.5" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Booking Progress Ring ──────────────────────────────────── */
function BookingRing({ done, total, size = 90 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const col = pct === 1 ? '#059669' : pct > 0.5 ? '#4F46E5' : '#D97706';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="9"
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 8px ${col}66)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px', color: col, lineHeight: 1 }}>{done}</div>
        <div style={{ fontSize: '0.58rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>of {total}</div>
      </div>
    </div>
  );
}

/* ── Course Card ────────────────────────────────────────────── */
function CourseCard({ c, tokens, isActive, nextToken, onOpt }) {
  const [hover, setHover] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pct = c.total_seats > 0 ? (c.total_seats - c.available_seats) / c.total_seats : 0;
  const u = urgency(c.available_seats, c.total_seats);
  const booked = c.is_booked_by_me;
  const myToken = booked ? tokens.find(t => t.course_id === c.course_id) : null;
  const canBook = isActive && !booked && nextToken && c.available_seats > 0;

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: booked ? 'linear-gradient(135deg, #F0FDF7, #ECFDF5)' : 'var(--surface)',
        borderRadius: 18, border: `1.5px solid ${booked ? '#A7F3D0' : hover && canBook ? 'var(--accent-3)' : 'var(--border)'}`,
        padding: '18px 20px', position: 'relative', overflow: 'hidden',
        transition: 'all 0.22s',
        transform: hover && canBook ? 'translateY(-3px)' : 'none',
        boxShadow: hover && canBook ? '0 8px 28px rgba(79,70,229,0.14)' : booked ? '0 2px 12px rgba(5,150,105,0.12)' : 'var(--shadow-sm)',
      }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '18px 18px 0 0',
        background: booked ? '#059669' : canBook ? '#4F46E5' : 'var(--border)', transition: 'background 0.2s' }} />

      {/* Subject code */}
      <div style={{ fontSize: '0.63rem', fontWeight: 800, color: booked ? '#059669' : 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 5, fontFamily: 'var(--mono)' }}>
        {c.subject_code || 'ELECTIVE'}
      </div>

      {/* Course name */}
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.35 }}>{c.course_name}</div>

      {/* Seat fill bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
          <span style={{ color: 'var(--text-3)' }}>{c.available_seats} seats left</span>
          <span style={{ color: u.color, fontWeight: 700, fontSize: '0.68rem' }}>{u.label}</span>
        </div>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: u.color, width: `${pct * 100}%`, transition: 'width 0.5s ease', boxShadow: `0 0 6px ${u.color}44` }} />
        </div>
      </div>

      {/* Expand: seat mini-grid */}
      {expanded && (
        <div style={{ marginBottom: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <SeatGrid total={c.total_seats} available={c.available_seats} myBooked={booked} />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {myToken && <span className="code-chip" style={{ fontSize: '0.68rem' }}>{myToken.token_code}</span>}
          {c.credit_weight && <span style={{ fontSize: '0.68rem', color: 'var(--text-4)' }}>{c.credit_weight} cr</span>}
          <button onClick={() => setExpanded(x => !x)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--text-4)', padding: 0, fontFamily: 'var(--font)' }}>
            {expanded ? '▴ less' : '▾ seats'}
          </button>
        </div>
        {booked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '5px 11px', fontSize: '0.76rem', fontWeight: 700, color: '#065F46' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Booked
          </div>
        ) : canBook ? (
          <button onClick={() => onOpt(c)}
            style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: 'white', border: 'none', borderRadius: 10, padding: '7px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 3px 12px rgba(79,70,229,0.4)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            OPT →
          </button>
        ) : !isActive ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-4)', padding: '5px 10px', background: 'var(--muted-bg)', borderRadius: 8 }}>Closed</span>
        ) : c.available_seats === 0 ? (
          <span style={{ fontSize: '0.72rem', color: '#DC2626', padding: '5px 10px', background: '#FEF2F2', borderRadius: 8, fontWeight: 700 }}>Full</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-4)', padding: '5px 10px', background: 'var(--muted-bg)', borderRadius: 8 }}>No token</span>
        )}
      </div>
    </div>
  );
}

/* ── Booking popup ──────────────────────────────────────────── */
function BookingModal({ course, nextToken, coursesRequired, onConfirm, onCancel, loading }) {
  const u = urgency(course.available_seats, course.total_seats);
  return (
    <Modal title="Confirm Booking" onClose={onCancel}
      footer={<>
        <button className="btn btn-surface btn-sm" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>{loading ? <Spinner /> : '🎫 Book Now'}</button>
      </>}>
      <div style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', borderRadius: 14, padding: '20px 22px', marginBottom: 18, color: 'white' }}>
        <div style={{ fontSize: '0.64rem', fontWeight: 700, opacity: 0.7, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 5 }}>{course.subject_code || 'ELECTIVE'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px', marginBottom: 12 }}>{course.course_name}</div>
        {/* Seat availability bar inside modal */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', opacity: 0.85, marginBottom: 5 }}>
            <span>{course.available_seats} seats remaining</span>
            <span>{Math.round((1 - u.pct) * 100)}% full</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(1 - u.pct) * 100}%`, background: 'rgba(255,255,255,0.85)', borderRadius: 99 }} />
          </div>
        </div>
      </div>
      <div className="booking-detail">
        {[
          ['Token', nextToken?.token_code, 'var(--accent)'],
          ['Priority', `Token #${nextToken?.token_number}`, null],
          ['Seats Left', `${course.available_seats} / ${course.total_seats}`, u.color],
        ].map(([lbl, val, col]) => (
          <div key={lbl} className="booking-detail-row">
            <span className="booking-detail-label">{lbl}</span>
            <span className="booking-detail-value" style={col ? { color: col } : {}}>{val}</span>
          </div>
        ))}
      </div>
      <div className="alert alert-warning" style={{ fontSize: '0.81rem', marginTop: 4 }}>
        ⚠ Irreversible. You must select all {coursesRequired || 'required'} courses.
      </div>
    </Modal>
  );
}

/* ── Success popup ──────────────────────────────────────────── */
function SuccessModal({ booking, onClose }) {
  return (
    <Modal title="" onClose={onClose}
      footer={<button className="btn btn-success btn-full" onClick={onClose}>Continue Booking</button>}>
      <div style={{ textAlign: 'center', padding: '16px 0 12px' }}>
        <div className="success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginBottom: 4 }}>Seat Secured!</div>
        <div className="success-seat">{booking.seat_code}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-4)', marginBottom: 20 }}>Your seat number</div>
      </div>
      <div className="booking-detail">
        {[['Course', booking.course_name], ['Token', booking.token_code], ['Time', new Date(booking.booked_at).toLocaleTimeString()]].map(([l,v]) => (
          <div key={l} className="booking-detail-row"><span className="booking-detail-label">{l}</span><span className="booking-detail-value">{v}</span></div>
        ))}
      </div>
    </Modal>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookCourse, setBookCourse] = useState(null);
  const [success, setSuccess]       = useState(null);
  const [booking, setBooking]       = useState(false);
  const [error, setError]           = useState('');
  const [filterText, setFilterText] = useState('');
  const [discoverQ, setDiscoverQ] = useState('');
  const [discoverRes, setDiscoverRes] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (discoverQ.length < 2) return;
    setIsDiscovering(true);
    try {
      const { data: res } = await api.get(`/search/elections?q=${discoverQ}`);
      setDiscoverRes(res.data);
    } catch (err) { setError('Search failed.'); }
    finally { setIsDiscovering(false); }
  };

  const handleJoin = (code) => {
    navigate(`/join/${code}`);
  };

  const load = useCallback(() => {
    api.get('/student/dashboard').then(r => setData(r.data))
      .catch(() => setError('Failed to load.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (data?.student?.election_status !== 'ACTIVE') return;
    const iv = setInterval(load, 15000); return () => clearInterval(iv);
  }, [data?.student?.election_status, load]);

  const doBook = async () => {
    if (!bookCourse || !nextToken) return;
    setBooking(true); setError('');
    try {
      const { data: res } = await api.post('/student/book', { course_id: bookCourse.course_id, election_id: data.student.election_id });
      setBookCourse(null); setSuccess(res.booking); load();
    } catch (err) { setError(err.response?.data?.message || 'Booking failed.'); setBookCourse(null); }
    finally { setBooking(false); }
  };

  if (loading) return (
    <div className="app-shell"><StudentSidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner dark /></main>
    </div>
  );

  const { student, tokens = [], courses = [], stats = {} } = data || {};
  const isActive   = student?.election_status === 'ACTIVE';
  const nextToken  = tokens.find(t => t.status === 'UNUSED');
  const bookedCnt  = stats.booked || 0;
  const totalToks  = stats.total_tokens || 0;
  const confirmed  = tokens.filter(t => ['CONFIRMED','AUTO'].includes(t.status)).length;
  const filtered   = filterText ? courses.filter(c => c.course_name.toLowerCase().includes(filterText.toLowerCase()) || (c.subject_code||'').toLowerCase().includes(filterText.toLowerCase())) : courses;

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>
              Hey, {student?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>
              <span className="code-chip">{student?.full_student_id}</span> &nbsp;·&nbsp; Sec {student?.section} &nbsp;·&nbsp; {student?.email}
            </p>
          </div>
          {student?.election_status && <StatusPill status={student.election_status} />}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ── No election ── */}
        {/* ── No election ── */}
        {!student?.election_id && (
          <div className="animate-in">
            <div style={{ background: 'var(--surface)', borderRadius: 24, padding: '48px 32px', textAlign: 'center', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />
              <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔍</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', fontSize: '1.6rem', marginBottom: 12 }}>Discover Live Elections</h2>
              <p style={{ color: 'var(--text-3)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
                You are not currently linked to any election. Search by <strong>Admin ID</strong> or <strong>Institution Name</strong> to join.
              </p>

              <form onSubmit={handleSearch} style={{ maxWidth: 500, margin: '0 auto', display: 'flex', gap: 10, marginBottom: 40 }}>
                <input 
                  value={discoverQ} onChange={e => setDiscoverQ(e.target.value)}
                  placeholder="e.g. ADM-2026-001 or IIT Madras..."
                  style={{ flex: 1, padding: '14px 20px', borderRadius: 14, border: '2px solid var(--border)', background: 'var(--muted-bg)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
                <button className="btn btn-primary btn-lg" type="submit" disabled={isDiscovering} style={{ borderRadius: 14, padding: '0 28px' }}>
                  {isDiscovering ? <Spinner /> : 'Search'}
                </button>
              </form>

              {discoverRes.length > 0 ? (
                <div style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                  {discoverRes.map(e => (
                    <div key={e.election_id} className="animate-in" style={{ background: 'var(--muted-bg)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{e.election_name}</span>
                          <StatusPill status={e.status} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 2 }}>{e.college_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', display: 'flex', gap: 8 }}>
                          <span>Conducted by: <strong style={{ color: 'var(--text-3)' }}>{e.admin_name}</strong></span>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--mono)' }}>ID: {e.admin_id}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                         <div className="code-chip" style={{ fontSize: '0.7rem' }}>{e.election_code}</div>
                         <button className="btn btn-navy btn-sm" onClick={() => handleJoin(e.election_code)}>Join →</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : discoverQ && !isDiscovering && (
                <div style={{ color: 'var(--text-4)', fontSize: '0.9rem' }}>No matching live elections found for "{discoverQ}"</div>
              )}
            </div>
          </div>
        )}

        {/* ── Status alerts ── */}
        {student?.election_id && student?.election_status && !isActive && (
          <Alert type={student.election_status === 'STOPPED' ? 'info' : 'warning'}>
            {student.election_status === 'STOPPED' ? '✅ Election ended — check My Results for your final allocation.' : student.election_status === 'PAUSED' ? '⏸ Election paused. Booking suspended temporarily.' : '🕒 Election not started yet. Come back soon.'}
          </Alert>
        )}

        {/* ── Stats + Token Pipeline ── */}
        {tokens.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>

            {/* Booking ring */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <BookingRing done={bookedCnt} total={totalToks} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text)', marginBottom: 2 }}>Tokens Used</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>{totalToks - bookedCnt} remaining</div>
                {confirmed > 0 && <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, marginTop: 4 }}>✓ {confirmed} confirmed</div>}
              </div>
              {isActive && nextToken && (
                <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-3)', borderRadius: 10, padding: '7px 14px', textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Next Token</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--accent)', fontSize: '0.95rem' }}>{nextToken.token_code}</div>
                </div>
              )}
            </div>

            {/* Token pipeline */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>Token Journey</div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.68rem' }}>
                  {[['#E2E8F0','#94A3B8','Idle'],['#4F46E5','white','Booked'],['#059669','white','Done'],['#DC2626','white','Burst']].map(([bg,col,lbl]) => (
                    <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, display: 'inline-block' }} />
                      <span style={{ color: 'var(--text-4)' }}>{lbl}</span>
                    </span>
                  ))}
                </div>
              </div>
              <TokenPipeline tokens={tokens} nextToken={nextToken} />
            </div>
          </div>
        )}

        {/* ── Course Grid ── */}
        {courses.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  {isActive ? 'Available Courses' : 'Course Listing'}
                </h2>
                {isActive && nextToken && (
                  <p style={{ fontSize: '0.79rem', color: 'var(--text-3)', marginTop: 2 }}>Click OPT on any course — uses your next token</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input placeholder="Filter courses…" value={filterText} onChange={e => setFilterText(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.84rem', fontFamily: 'var(--font)', outline: 'none', width: 180, transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'} />
                <span style={{ background: 'var(--muted-bg)', borderRadius: 8, padding: '5px 11px', fontSize: '0.76rem', color: 'var(--text-3)', fontWeight: 600 }}>
                  {filtered.length} / {courses.length}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
              {filtered.map(c => (
                <CourseCard key={c.course_id} c={c} tokens={tokens} isActive={isActive} nextToken={nextToken} onOpt={setBookCourse} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>No courses match "{filterText}"</div>
              </div>
            )}
          </div>
        )}

        {/* ── Modals ── */}
        {bookCourse && <BookingModal course={bookCourse} nextToken={nextToken} coursesRequired={student?.final_courses_per_student} onConfirm={doBook} onCancel={() => setBookCourse(null)} loading={booking} />}
        {success && <SuccessModal booking={success} onClose={() => setSuccess(null)} />}

      </main>
      <style>{`@keyframes tokenPulse { 0%,100%{box-shadow:0 4px 14px rgba(79,70,229,0.4)} 50%{box-shadow:0 4px 22px rgba(79,70,229,0.75)} }`}</style>
    </div>
  );
}

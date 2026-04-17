import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Spinner } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function JoinViaCode() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [code, setCode]       = useState('');
  const [email, setEmail]     = useState(user?.email || '');
  const [step, setStep]       = useState('lookup'); // lookup | preview | applying | done | error
  const [election, setElection] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [lookupError, setLookupError] = useState('');
  const [applyError, setApplyError]   = useState('');
  const [loading, setLoading]         = useState(false);

  // Participation history
  const [history, setHistory] = useState([]);
  useEffect(() => {
    api.get('/cav/participation').then(r => setHistory(r.data.data || [])).catch(() => {});
  }, []);

  // Display name update
  const [showNameUpdate, setShowNameUpdate] = useState(false);
  const [newName, setNewName]   = useState('');
  const [nameElecId, setNameElecId] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg]   = useState('');

  const lookup = async () => {
    if (!code.trim()) return setLookupError('Enter a code.');
    setLookupError(''); setLoading(true);
    try {
      const { data } = await api.get(`/join/${code.trim().toUpperCase()}`);
      setElection(data.election);
      setParticipants(data.participants || []);
      setStep('preview');
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Invalid or expired code.');
    } finally { setLoading(false); }
  };

  const apply = async () => {
    if (!email.trim()) return setApplyError('Email required.');
    setApplyError(''); setStep('applying');
    try {
      await api.post('/cav/apply', { code: code.trim().toUpperCase(), email: email.trim() });
      setStep('done');
      api.get('/cav/participation').then(r => setHistory(r.data.data || [])).catch(() => {});
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Application failed.');
      setStep('preview');
    }
  };

  const saveDisplayName = async () => {
    if (!newName.trim()) return;
    setNameSaving(true);
    try {
      await api.put('/cav/name', { election_id: nameElecId, display_name: newName.trim() });
      setNameMsg('Name updated successfully!');
      setNewName('');
      api.get('/cav/participation').then(r => setHistory(r.data.data || [])).catch(() => {});
      setTimeout(() => { setShowNameUpdate(false); setNameMsg(''); }, 1800);
    } catch (err) {
      setNameMsg(err.response?.data?.message || 'Failed to update name.');
    } finally { setNameSaving(false); }
  };

  const confirmed = participants.filter(p => p.status === 'CONFIRMED');
  const pending   = participants.filter(p => p.status === 'PENDING');

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Join Election</h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Enter an election code or paste a join link to apply</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* ── Main panel ── */}
          <div>
            {/* Step: lookup */}
            {(step === 'lookup' || step === 'preview' || step === 'applying') && (
              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '28px 32px', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 20 }}>
                  {step === 'preview' ? `Preview: ${election?.election_name}` : 'Enter Election Code'}
                </div>

                {step === 'lookup' && (
                  <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: lookupError ? 10 : 0 }}>
                      <input
                        value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && lookup()}
                        placeholder="e.g. 4A2F9CB1"
                        className="form-input"
                        style={{ flex: 1, fontFamily: 'var(--mono)', letterSpacing: '2px', fontSize: '1.1rem', textAlign: 'center' }}
                      />
                      <button className="btn btn-primary" onClick={lookup} disabled={loading} style={{ minWidth: 100 }}>
                        {loading ? <Spinner /> : 'Look Up →'}
                      </button>
                    </div>
                    {lookupError && <div className="alert alert-error" style={{ marginTop: 10 }}>{lookupError}</div>}
                    <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-4)', lineHeight: 1.7 }}>
                      You can also click a join link shared by your admin — it will open this page automatically.
                    </div>
                  </>
                )}

                {(step === 'preview' || step === 'applying') && election && (
                  <>
                    {/* Election info */}
                    <div style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', borderRadius: 14, padding: '20px 22px', marginBottom: 20, color: 'white' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.7, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 5 }}>{election.college_name}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 10 }}>{election.election_name}</div>
                      <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem', opacity: 0.85 }}>
                        {election.semester_tag && <span>{election.semester_tag}</span>}
                        <span>{election.final_courses_per_student} courses/student</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: election.status === 'ACTIVE' ? '#34D399' : '#94A3B8', display: 'inline-block' }} />
                          {election.status}
                        </span>
                      </div>
                    </div>

                    {/* Participants preview */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                        Participants
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>{confirmed.length} confirmed</span>
                        {pending.length > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', fontWeight: 700 }}>{pending.length} pending</span>}
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
                        {participants.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-4)', fontSize: '0.84rem' }}>No participants yet</div>
                        ) : participants.map((p, i) => (
                          <div key={p.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < participants.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.status === 'CONFIRMED' ? '#ECFDF5' : 'var(--muted-bg)', border: `2px solid ${p.status === 'CONFIRMED' ? '#A7F3D0' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: p.status === 'CONFIRMED' ? '#059669' : 'var(--text-4)', flexShrink: 0 }}>
                              {p.display_name?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{p.display_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}>Sec {p.section}</div>
                            </div>
                            <span style={{ fontSize: '0.66rem', padding: '2px 8px', borderRadius: 99, background: p.status === 'CONFIRMED' ? '#ECFDF5' : '#FFFBEB', color: p.status === 'CONFIRMED' ? '#059669' : '#D97706', fontWeight: 700 }}>
                              {p.status === 'CONFIRMED' ? '✓ In' : '⏳ Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Apply form */}
                    {applyError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{applyError}</div>}

                    <div style={{ marginBottom: 14 }}>
                      <label className="form-label">Confirm Your Email (must match your account)</label>
                      <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-surface" onClick={() => { setStep('lookup'); setElection(null); }}>← Back</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={apply} disabled={step === 'applying'}>
                        {step === 'applying' ? <><Spinner /> Submitting…</> : '✋ Apply for Election'}
                      </button>
                    </div>

                    <div style={{ marginTop: 12, fontSize: '0.76rem', color: 'var(--text-4)', lineHeight: 1.7, padding: '10px 14px', background: 'var(--muted-bg)', borderRadius: 10 }}>
                      Your email must exactly match your registered account. The admin will review your application. You'll receive a message when confirmed. One application per election only.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: done */}
            {step === 'done' && (
              <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1.5px solid #A7F3D0', boxShadow: '0 4px 24px rgba(5,150,105,0.12)', padding: '44px 36px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', border: '3px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 18px' }}>✅</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', marginBottom: 8 }}>Application Submitted!</h3>
                <p style={{ color: 'var(--text-3)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.7 }}>
                  Your application is pending admin review. You'll receive a message here when confirmed. Check your Messages tab.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => navigate('/student/messages')}>View Messages →</button>
                  <button className="btn btn-ghost" onClick={() => { setStep('lookup'); setCode(''); setElection(null); }}>Join Another</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar: history ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Participation history */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>My Applications</div>
              </div>
              {history.length === 0 ? (
                <div style={{ padding: '28px 22px', textAlign: 'center', color: 'var(--text-4)', fontSize: '0.84rem' }}>No applications yet</div>
              ) : history.map(h => {
                const statusColor = { PENDING: '#D97706', CONFIRMED: '#059669', REJECTED: '#DC2626' };
                const statusBg    = { PENDING: '#FFFBEB', CONFIRMED: '#ECFDF5', REJECTED: '#FEF2F2' };
                return (
                  <div key={h.participant_id} style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: 4 }}>{h.election_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}>{new Date(h.applied_at).toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 9px', borderRadius: 99, background: statusBg[h.status], color: statusColor[h.status], fontWeight: 700 }}>{h.status}</span>
                    </div>
                    {h.status === 'CONFIRMED' && !h.name_updated && (
                      <button onClick={() => { setNameElecId(h.election_id); setNewName(h.display_name || ''); setShowNameUpdate(true); }}
                        style={{ marginTop: 8, width: '100%', padding: '6px 12px', borderRadius: 8, border: '1.5px solid #818CF8', background: '#EEF2FF', color: '#4F46E5', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.76rem' }}>
                        ✏️ Update Display Name
                      </button>
                    )}
                    {h.name_updated && (
                      <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>✓ Name updated: {h.display_name}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Name update modal-like inline card */}
            {showNameUpdate && (
              <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1.5px solid #818CF8', boxShadow: '0 4px 24px rgba(79,70,229,0.15)', padding: '22px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14 }}>Update Display Name</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>
                  Your display name appears in the participant list. Update it to match the records given by your admin.
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">New Display Name</label>
                  <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Your official name" />
                </div>
                {nameMsg && <div className={`alert alert-${nameMsg.includes('success') ? 'success' : 'error'}`} style={{ marginBottom: 10 }}>{nameMsg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNameUpdate(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={saveDisplayName} disabled={nameSaving}>
                    {nameSaving ? <Spinner /> : 'Save Name'}
                  </button>
                </div>
              </div>
            )}

            {/* How it works */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 14 }}>How It Works</div>
              {[
                ['1', 'Get Code', 'Receive the election code or link from your admin.'],
                ['2', 'Apply', 'Enter the code and confirm your email to apply.'],
                ['3', 'Wait', 'Admin reviews and confirms your application.'],
                ['4', 'Name Update', 'Update your display name to match official records.'],
                ['5', 'Election Begins', 'Course selection (opting) starts once admin initiates.'],
              ].map(([n, title, desc]) => (
                <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: 'white', flexShrink: 0, marginTop: 2 }}>{n}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Spinner, EmptyState, Modal } from '../../components/ui/index';
import api from '../../services/api';

const STATUS_STYLE = {
  PENDING:   { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', label: '⏳ Awaiting Confirmation', icon: '⏳' },
  CONFIRMED: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', label: '✅ Confirmed',             icon: '✅' },
  REJECTED:  { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', label: '❌ Rejected',              icon: '❌' },
};

function NameUpdateModal({ participation, onClose, onSuccess }) {
  const [name, setName] = useState(participation.display_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) return setError('Name must be at least 2 characters.');
    setSaving(true); setError('');
    try {
      await api.put('/cav/name', { election_id: participation.election_id, display_name: name.trim() });
      onSuccess(name.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Update Display Name" onClose={onClose}
      footer={<>
        <button className="btn btn-surface btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : 'Save Name'}</button>
      </>}>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginBottom: 18, lineHeight: 1.6 }}>
        The admin has provided records with official names. Please update your display name to match.
      </p>
      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">Display Name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your official name" />
        <div style={{ fontSize: '0.74rem', color: 'var(--text-4)', marginTop: 6 }}>This is how you'll appear in the election participant list.</div>
      </div>
    </Modal>
  );
}

export default function StudentParticipation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [codeInput, setCodeInput]           = useState('');
  const [joining, setJoining]               = useState(false);
  const [joinError, setJoinError]           = useState('');
  const [joinInfo, setJoinInfo]             = useState(null); // resolved election info before apply
  const [nameModal, setNameModal]           = useState(null); // which participation to update name

  const load = useCallback(() => {
    api.get('/cav/participation')
      .then(r => setParticipations(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Step 1: resolve code → show preview
  const handleResolve = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return setJoinError('Enter an election code.');
    setJoining(true); setJoinError(''); setJoinInfo(null);
    try {
      const { data } = await api.get(`/join/${code}`);
      setJoinInfo({ ...data, code });
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Invalid code.');
    } finally { setJoining(false); }
  };

  // Step 2: confirm apply
  const handleApply = async () => {
    if (!joinInfo) return;
    setJoining(true); setJoinError('');
    try {
      await api.post('/cav/apply', { code: joinInfo.code, email: user.email });
      setJoinInfo(null); setCodeInput('');
      load();
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Application failed.');
    } finally { setJoining(false); }
  };

  const handleNameSuccess = (newName, participationId) => {
    setParticipations(ps => ps.map(p => p.participant_id === participationId ? { ...p, display_name: newName, name_updated: true } : p));
    setNameModal(null);
  };

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>My Elections</h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Join elections via code or link — track your application status</p>
        </div>

        {/* ── Join by code ── */}
        <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '24px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          {/* subtle gradient */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: '100%', background: 'radial-gradient(ellipse at right, rgba(79,70,229,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>Join an Election</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 18, lineHeight: 1.6 }}>
            Enter the election code or paste the join link your conductor shared with you.
          </p>

          {joinError && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>{joinError}</div>
          )}

          {joinInfo ? (
            /* Preview before applying */
            <div style={{ background: 'var(--muted-bg)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)', marginBottom: 4 }}>{joinInfo.election.election_name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{joinInfo.election.college_name} · {joinInfo.election.admin_name}</div>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: 99, background: joinInfo.election.status === 'ACTIVE' ? '#ECFDF5' : '#F3F4F6', color: joinInfo.election.status === 'ACTIVE' ? '#059669' : '#6B7280', fontWeight: 700 }}>
                  {joinInfo.election.status}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 14 }}>
                {joinInfo.participants.filter(p => p.status === 'CONFIRMED').length} participants confirmed &nbsp;·&nbsp; {joinInfo.election.final_courses_per_student} courses per student
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleApply} disabled={joining}>
                  {joining ? <Spinner /> : '✋ Confirm Apply'}
                </button>
                <button className="btn btn-surface" onClick={() => { setJoinInfo(null); setJoinError(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleResolve()}
                placeholder="e.g. A3F9BC2D"
                style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: '1rem', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor='var(--accent)'}
                onBlur={e => e.target.style.borderColor='var(--border)'} />
              <button className="btn btn-primary" onClick={handleResolve} disabled={joining} style={{ minWidth: 120 }}>
                {joining ? <Spinner /> : 'Look Up →'}
              </button>
            </div>
          )}

          <p style={{ fontSize: '0.74rem', color: 'var(--text-4)', marginTop: 12 }}>
            Or open the join link directly in your browser — it will take you to the same page.
          </p>
        </div>

        {/* ── My participations ── */}
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 16 }}>My Applications</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spinner dark /></div>
        ) : participations.length === 0 ? (
          <EmptyState icon="📋" title="No applications yet"
            message="Use the election code above to apply for an election. Once confirmed by the admin, you'll join the election." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {participations.map(p => {
              const s = STATUS_STYLE[p.status] || STATUS_STYLE.PENDING;
              return (
                <div key={p.participant_id}
                  style={{ background: 'var(--surface)', borderRadius: 18, border: `1.5px solid ${s.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>

                  {/* Icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, border: `1px solid ${s.border}` }}>
                    {s.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{p.election_name}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 700, border: `1px solid ${s.border}` }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>Display: <strong style={{ color: 'var(--text-2)' }}>{p.display_name}</strong></span>
                      <span>Applied: {new Date(p.applied_at).toLocaleDateString()}</span>
                      {p.confirmed_at && <span>Confirmed: {new Date(p.confirmed_at).toLocaleDateString()}</span>}
                      {p.cav_active && p.election_code && <span>Code: <span className="code-chip" style={{ fontSize: '0.7rem' }}>{p.election_code}</span></span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    {p.status === 'CONFIRMED' && !p.name_updated && (
                      <button className="btn btn-primary btn-sm" onClick={() => setNameModal(p)}>
                        ✏ Update Name
                      </button>
                    )}
                    {p.status === 'CONFIRMED' && (
                      <button className="btn btn-surface btn-sm" onClick={() => navigate('/student')}>
                        Go to Election →
                      </button>
                    )}
                    {p.cav_active && p.election_code && (
                      <a href={p.join_link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View Page ↗</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Name update modal */}
        {nameModal && (
          <NameUpdateModal
            participation={nameModal}
            onClose={() => setNameModal(null)}
            onSuccess={(newName) => handleNameSuccess(newName, nameModal.participant_id)}
          />
        )}
      </main>
    </div>
  );
}

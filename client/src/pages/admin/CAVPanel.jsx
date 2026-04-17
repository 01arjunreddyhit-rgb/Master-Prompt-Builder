import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, Badge } from '../../components/ui/index';
import api from '../../services/api';

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={copy} style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${copied ? '#A7F3D0' : 'var(--border)'}`, background: copied ? 'var(--emerald-light)' : 'var(--surface)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font)', color: copied ? 'var(--emerald)' : 'var(--text-3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}

function ParticipantRow({ p, onAction, acting }) {
  const [showDetail, setShowDetail] = useState(false);
  const statusColor = { PENDING: '#D97706', CONFIRMED: '#059669', REJECTED: '#DC2626' };
  const statusBg    = { PENDING: '#FFFBEB', CONFIRMED: '#ECFDF5', REJECTED: '#FEF2F2' };
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setShowDetail(true)}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${statusColor[p.status]}22`, border: `2px solid ${statusColor[p.status]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: statusColor[p.status], flexShrink: 0 }}>
              {p.display_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{p.display_name}</div>
              {p.name !== p.display_name && <div style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}>aka {p.name}</div>}
            </div>
          </div>
        </td>
        <td><span className="code-chip" style={{ fontSize: '0.74rem' }}>{p.register_number}</span></td>
        <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{p.email}</td>
        <td><Badge variant="blue">Sec {p.section}</Badge></td>
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: statusBg[p.status], color: statusColor[p.status], fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[p.status] }} />{p.status}
          </span>
        </td>
        <td style={{ fontSize: '0.74rem', color: 'var(--text-4)' }}>{new Date(p.applied_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          {p.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-success btn-sm" disabled={acting === p.participant_id}
                onClick={e => { e.stopPropagation(); onAction(p.participant_id, 'confirm'); }}>
                {acting === p.participant_id ? <Spinner /> : '✓ Confirm'}
              </button>
              <button className="btn btn-danger btn-sm" disabled={acting === p.participant_id}
                onClick={e => { e.stopPropagation(); onAction(p.participant_id, 'reject'); }}>✕</button>
            </div>
          )}
          {p.status === 'CONFIRMED' && <Badge variant="green">Admitted</Badge>}
          {p.status === 'REJECTED' && <Badge variant="red">Rejected</Badge>}
        </td>
      </tr>
      {showDetail && (
        <Modal title="Participant Details" onClose={() => setShowDetail(false)} maxWidth={480}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'var(--muted-bg)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
            {[['Full Name', p.name], ['Display Name', p.display_name], ['Register No.', p.register_number], ['Section', `Section ${p.section}`], ['Email', p.email], ['Applied', new Date(p.applied_at).toLocaleString()]].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{lbl}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{val}</div>
              </div>
            ))}
          </div>
          {p.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => { onAction(p.participant_id, 'confirm'); setShowDetail(false); }}>✓ Confirm</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { onAction(p.participant_id, 'reject'); setShowDetail(false); }}>✕ Reject</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default function CAVPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [elections, setElections]         = useState([]);
  const [selectedId, setSelectedId]       = useState(searchParams.get('id') || '');
  const [cav, setCav]                     = useState(null);
  const [participants, setParticipants]   = useState([]);
  const [cavLoading, setCavLoading]       = useState(false);
  const [acting, setActing]               = useState(null);
  const [msg, setMsg]                     = useState(null);
  const [filterStatus, setFilterStatus]   = useState('ALL');

  useEffect(() => {
    api.get('/elections').then(r => {
      const list = r.data.data || [];
      setElections(list);
      if (!selectedId && list.length) setSelectedId(String(list[0].election_id));
    });
  }, []);

  const loadCAV = useCallback(() => {
    if (!selectedId) return;
    setCavLoading(true);
    Promise.all([api.get(`/cav/${selectedId}`), api.get(`/cav/${selectedId}/participants`)])
      .then(([cR, pR]) => { setCav(cR.data); setParticipants(pR.data.data || []); })
      .catch(err => setMsg({ type: 'error', text: err.response?.data?.message || 'Load failed.' }))
      .finally(() => setCavLoading(false));
  }, [selectedId]);

  useEffect(() => { if (selectedId) loadCAV(); }, [selectedId, loadCAV]);

  const regenerate = async () => {
    if (!window.confirm('Regenerate? The old link will stop working.')) return;
    try { await api.post(`/cav/${selectedId}/regenerate`); loadCAV(); setMsg({ type: 'success', text: 'CAV regenerated.' }); }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Failed.' }); }
  };

  const handleAction = async (pid, action) => {
    setActing(pid);
    try { await api.post(`/cav/participants/${pid}/review`, { action }); setMsg({ type: 'success', text: `Participant ${action === 'confirm' ? 'confirmed ✓' : 'rejected'}.` }); loadCAV(); }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' }); }
    finally { setActing(null); }
  };

  const filtered = filterStatus === 'ALL' ? participants : participants.filter(p => p.status === filterStatus);
  const counts = { ALL: participants.length, PENDING: participants.filter(p => p.status === 'PENDING').length, CONFIRMED: participants.filter(p => p.status === 'CONFIRMED').length, REJECTED: participants.filter(p => p.status === 'REJECTED').length };
  const election = elections.find(e => String(e.election_id) === String(selectedId));
  const cavData = cav?.cav;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>CAV Panel</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Code · Access · Verification — manage join links and participants</p>
          </div>
          {elections.length > 1 && (
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-select" style={{ minWidth: 240 }}>
              {elections.map(e => <option key={e.election_id} value={e.election_id}>{e.election_name}</option>)}
            </select>
          )}
        </div>

        {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20, cursor: 'pointer' }} onClick={() => setMsg(null)}>{msg.text} <span style={{ float: 'right', fontWeight: 700 }}>✕</span></div>}

        {!selectedId ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗳️</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No Election Selected</div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/election')}>Create Election →</button>
          </div>
        ) : cavLoading && !cavData ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : (
          <>
            {/* CAV Card */}
            {cavData && (
              <div style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #1C2537 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 90% 50%, rgba(79,70,229,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Election Access Token (CAV)</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'white', letterSpacing: '-0.3px', marginBottom: 8 }}>{election?.election_name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: cavData.is_active ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', color: cavData.is_active ? '#34D399' : '#FCA5A5', fontWeight: 700 }}>
                          {cavData.is_active ? '● Link Active' : '● Link Expired'}
                        </span>
                        {election?.status && <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{election.status}</span>}
                      </div>
                    </div>
                    <button onClick={regenerate} style={{ padding: '10px 18px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                      🔄 Regenerate
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
                    {/* Code */}
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Election Code</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.5rem', color: '#818CF8', letterSpacing: '3px', marginBottom: 12 }}>{cavData.election_code}</div>
                      <CopyBtn text={cavData.election_code} label="Copy Code" />
                    </div>
                    {/* Link */}
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Join Link</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: 12, wordBreak: 'break-all', lineHeight: 1.6 }}>{cavData.join_link}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <CopyBtn text={cavData.join_link} label="Copy Link" />
                        <a href={cavData.join_link} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>🔗 Open</a>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: '0.76rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
                    📌 Share this code or link with participants. They apply, you confirm below. Link expires when election stops. One application per person enforced.
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Applied', v: counts.ALL, color: '#4F46E5' },
                { label: 'Pending Review', v: counts.PENDING, color: '#D97706' },
                { label: 'Confirmed', v: counts.CONFIRMED, color: '#059669' },
                { label: 'Rejected', v: counts.REJECTED, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '14px 14px 0 0' }} />
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Participants table */}
            <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Applicants</div>
                <div style={{ display: 'flex', background: 'var(--muted-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
                  {['ALL','PENDING','CONFIRMED','REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.74rem', fontWeight: 700, background: filterStatus === s ? 'var(--surface)' : 'transparent', color: filterStatus === s ? 'var(--text)' : 'var(--text-4)', boxShadow: filterStatus === s ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {s} <span style={{ fontSize: '0.62rem', background: filterStatus === s ? 'var(--accent)' : 'var(--border)', color: filterStatus === s ? 'white' : 'var(--text-4)', padding: '0px 5px', borderRadius: 99 }}>{counts[s]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-4)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 10 }}>👥</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>{participants.length === 0 ? 'No applications yet' : `No ${filterStatus.toLowerCase()} participants`}</div>
                  {participants.length === 0 && <div style={{ fontSize: '0.82rem' }}>Share the code or link above with participants.</div>}
                </div>
              ) : (
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                    <thead><tr><th>Participant</th><th>Reg No.</th><th>Email</th><th>Section</th><th>Status</th><th>Applied</th><th>Action</th></tr></thead>
                    <tbody>
                      {filtered.map(p => <ParticipantRow key={p.participant_id} p={p} onAction={handleAction} acting={acting} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

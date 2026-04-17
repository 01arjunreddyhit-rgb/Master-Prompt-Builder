import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, Badge, Card, Button, Alert } from '../../components/ui/index';
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
        <td>
          {p.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-success btn-sm" disabled={acting === p.participant_id} onClick={e => { e.stopPropagation(); onAction(p.participant_id, 'confirm'); }}>Confirm</button>
              <button className="btn btn-danger btn-sm" disabled={acting === p.participant_id} onClick={e => { e.stopPropagation(); onAction(p.participant_id, 'reject'); }}>✕</button>
            </div>
          )}
        </td>
      </tr>
      {showDetail && (
        <Modal title="Participant Details" onClose={() => setShowDetail(false)}>
          <div style={{ padding: '10px 0' }}>
            {[['Full Name', p.name], ['Display Name', p.display_name], ['Register No.', p.register_number], ['Section', `Section ${p.section}`], ['Email', p.email]].map(([lbl, val]) => (
              <div key={lbl} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', textTransform: 'uppercase' }}>{lbl}</div>
                <div style={{ fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

export default function CAVPanel() {
  const navigate = useNavigate();
  const { selectedElection } = useElection();
  const [cav, setCav]                     = useState(null);
  const [participants, setParticipants]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [acting, setActing]               = useState(null);
  const [msg, setMsg]                     = useState(null);
  const [filterStatus, setFilterStatus]   = useState('ALL');

  const load = useCallback(() => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    setLoading(true);
    Promise.all([
      api.get(`/cav/${selectedElection.election_id}`),
      api.get(`/cav/${selectedElection.election_id}/participants`)
    ]).then(([cR, pR]) => {
      setCav(cR.data.cav);
      setParticipants(pR.data.data || []);
    }).catch(() => setMsg({ type: 'error', text: 'Load failed.' }))
      .finally(() => setLoading(false));
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  const regenerate = async () => {
    if (!window.confirm('Regenerate? The old link will stop working.')) return;
    try {
      await api.post(`/cav/${selectedElection.election_id}/regenerate`);
      load();
      setMsg({ type: 'success', text: 'CAV regenerated.' });
    } catch (err) { setMsg({ type: 'error', text: 'Failed.' }); }
  };

  const handleAction = async (pid, action) => {
    setActing(pid);
    try {
      await api.post(`/cav/participants/${pid}/review`, { action });
      setMsg({ type: 'success', text: `Participant ${action === 'confirm' ? 'confirmed' : 'rejected'}.` });
      load();
    } catch (err) { setMsg({ type: 'error', text: 'Action failed.' }); }
    finally { setActing(null); }
  };

  const filtered = filterStatus === 'ALL' ? participants : participants.filter(p => p.status === filterStatus);
  const counts = { 
    ALL: participants.length, 
    PENDING: participants.filter(p => p.status === 'PENDING').length, 
    CONFIRMED: participants.filter(p => p.status === 'CONFIRMED').length, 
    REJECTED: participants.filter(p => p.status === 'REJECTED').length 
  };

  if (!selectedElection && !loading) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>CAV Panel</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : (
          <>
            {cav && (
              <div style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #1C2537 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Join Link & Code</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '1.5rem', fontWeight: 700, color: '#818CF8' }}>{cav.election_code}</div>
                    </div>
                    <button className="btn btn-surface btn-sm" onClick={regenerate}>Regenerate Code</button>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: 12, wordBreak: 'break-all' }}>{cav.join_link}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <CopyBtn text={cav.join_link} label="Copy Link" />
                      <CopyBtn text={cav.election_code} label="Copy Code" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total', v: counts.ALL, color: '#4F46E5' },
                { label: 'Pending', v: counts.PENDING, color: '#D97706' },
                { label: 'Confirmed', v: counts.CONFIRMED, color: '#059669' },
                { label: 'Rejected', v: counts.REJECTED, color: '#DC2626' },
              ].map(s => (
                <Card key={s.label} style={{ borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.v}</div>
                </Card>
              ))}
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Applicants</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['ALL','PENDING','CONFIRMED','REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Participant</th><th>Reg No.</th><th>Email</th><th>Section</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {filtered.map(p => <ParticipantRow key={p.participant_id} p={p} onAction={handleAction} acting={acting} />)}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

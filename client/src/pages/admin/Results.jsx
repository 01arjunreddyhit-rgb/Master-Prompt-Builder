import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, EmptyState, Card, Button, Badge, Alert } from '../../components/ui/index';
import api from '../../services/api';

function TierPill({ n }) {
  const colors = ['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'];
  const bg     = ['','#EEF2FF','#F5F3FF','#FFFBEB','#ECFDF5','#FEF2F2'];
  return (
    <span style={{ padding: '2px 9px', borderRadius: 99, background: bg[n]||bg[1], color: colors[n]||colors[1], fontWeight: 800, fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
      T{n}
    </span>
  );
}

function ChoiceResultsTable({ summary }) {
  const tiers = [1,2,3,4,5];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
        <thead>
          <tr style={{ background: 'var(--ink)', color: 'white' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left' }}>Course</th>
            {tiers.map(n => <th key={n} style={{ padding: '10px 14px' }}>T{n}</th>)}
            <th style={{ padding: '10px 14px' }}>Total</th>
            <th style={{ padding: '10px 14px' }}>Distribution</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(c => (
            <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '11px 14px', fontWeight: 700 }}>{c.course_name}</td>
              {tiers.map(n => (
                <td key={n} style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{c[`t${n}`] || '—'}</td>
              ))}
              <td style={{ textAlign: 'center', fontWeight: 800 }}>{c.total}</td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.total / (c.max_enrollment || 1)) * 100}%`, background: 'var(--accent)', height: '100%' }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminResults() {
  const { selectedElection } = useElection();
  const navigate = useNavigate();
  const [choices, setChoices] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    setLoading(true);
    try {
      const [cR, sR] = await Promise.all([
        api.get(`/results/${selectedElection.election_id}/choices`),
        api.get(`/results/${selectedElection.election_id}/sessions`)
      ]);
      setChoices(cR.data);
      setSessions(sR.data.data || []);
    } catch (err) {
      setMsg({ type: 'error', text: 'Load failed.' });
    } finally {
      setLoading(false);
    }
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!selectedElection && !loading) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.7rem', fontWeight:800, color:'var(--text)', marginBottom:4 }}>Results & Allocation Sessions</h1>
            <p style={{ fontSize:'0.84rem', color:'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {loading ? (
          <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
            <div>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Locked Choice Results</h3>
                </div>
                {choices ? <ChoiceResultsTable summary={choices.summary || []} /> : <div style={{ padding: 40, textAlign: 'center' }}>No results locked.</div>}
              </Card>
            </div>
            <div>
              <Card>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Saved Sessions</h3>
                {sessions.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>No sessions created for this election yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sessions.map(s => (
                      <div key={s.session_id} style={{ padding: 12, background: 'var(--muted-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.session_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="primary" style={{ width: '100%', marginTop: 20 }}>+ New Session</Button>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

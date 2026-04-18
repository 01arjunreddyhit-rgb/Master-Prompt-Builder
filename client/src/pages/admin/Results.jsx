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
          {(summary || []).map(c => (
            <tr key={c?.course_id || Math.random()} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '11px 14px', fontWeight: 700 }}>{c?.course_name || 'Unknown Course'}</td>
              {tiers.map(n => (
                <td key={n} style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{c[`t${n}`] || '—'}</td>
              ))}
              <td style={{ textAlign: 'center', fontWeight: 800 }}>{c.total}</td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(Number(c?.total || 0) / (Number(c?.max_enrollment || 1))) * 100}%`, background: 'var(--accent)', height: '100%' }} />
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
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [comparison, setComparison] = useState(null);

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

  const toggleSession = (id) => {
    setSelectedSessions(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 2 ? [...prev, id] : prev)
    );
  };

  const handleCompare = () => {
    if (selectedSessions.length !== 2) return;
    const s1 = sessions.find(s => s.session_id === selectedSessions[0]);
    const s2 = sessions.find(s => s.session_id === selectedSessions[1]);
    setComparison({ s1, s2 });
  };

  if (!selectedElection || loading) {
    return (
      <div className="app-shell">
        <AdminSidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner dark />
        </main>
      </div>
    );
  }

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
        ) : selectedElection?.status === 'NOT_STARTED' ? (
          <div style={{ textAlign:'center', padding:'80px 20px', background:'var(--surface)', borderRadius:24, border:'1.5px dashed var(--border)' }}>
             <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⏳</div>
             <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.4rem', color:'var(--text)', marginBottom:8 }}>Election Not Started</h2>
             <p style={{ color:'var(--text-4)', fontSize:'0.9rem', maxWidth:400, margin:'0 auto 24px' }}>Results and allocation sessions will appear here once the election has been initiated and student participation begins.</p>
             <Button variant="primary" onClick={() => navigate('/admin/election')}>Go to Election Control →</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            <div>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Locked Choice Results</h3>
                  {choices && <Badge variant="navy">{choices.summary?.length || 0} Courses</Badge>}
                {choices?.summary && choices.summary.length > 0 ? (
                  <ChoiceResultsTable summary={choices.summary} />
                ) : (
                  <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔒</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-3)' }}>No results locked yet.</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', marginTop: 4 }}>Locked results appear once the election is finalized.</div>
                  </div>
                )}
              </Card>
            </div>
            <div>
              <Card style={{ position: 'sticky', top: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Saved Sessions</h3>
                  {selectedSessions.length === 2 && (
                    <button className="btn btn-primary btn-sm" onClick={handleCompare}>Compare</button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <EmptyState title="No Sessions" message="No allocation sessions found for this election." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sessions.map(s => {
                      const selected = selectedSessions.includes(s.session_id);
                      return (
                        <div 
                          key={s.session_id} 
                          onClick={() => toggleSession(s.session_id)}
                          style={{ 
                            padding: 14, 
                            background: selected ? 'var(--accent-light)' : 'var(--surface)', 
                            borderRadius: 14, 
                            border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: selected ? 'var(--accent)' : 'var(--text)' }}>{s.session_name}</div>
                            {selected && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>✓</div>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Unknown Date'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 20, fontSize: '0.75rem', color: 'var(--text-4)', textAlign: 'center' }}>
                  Select two sessions to compare metrics side-by-side.
                </div>
              </Card>
            </div>
          </div>
        )}

        {comparison && (
          <Modal title="Compare Allocation Sessions" onClose={() => setComparison(null)} maxWidth={700}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[comparison.s1, comparison.s2].map((s, i) => (
                <div key={i} style={{ background: 'var(--muted-bg)', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: 'var(--accent)' }}>{s.session_name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '10px 14px', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Created At</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    {/* Placeholders for actual metric keys if they exist in DB */}
                    <div style={{ padding: '10px 14px', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Session ID</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--mono)' }}>#{s.session_id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: 'var(--accent-light)', borderRadius: 12, color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
               Detailed row-by-row differences can be viewed in the full export.
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

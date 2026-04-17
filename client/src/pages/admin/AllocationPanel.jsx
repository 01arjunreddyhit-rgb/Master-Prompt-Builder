import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Alert, Spinner, Modal, Card, Button, Input, Badge } from '../../components/ui/index';
import api from '../../services/api';

const T_COLORS = ['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'];

function WaterfallBar({ t1=0, t2=0, t3=0, t4=0, t5=0, max=1, height=24 }) {
  const safe = max || 1;
  return (
    <div style={{ display:'flex', height, borderRadius:6, overflow:'hidden', background:'var(--muted-bg)', gap:1 }}>
      {[{v:t1,c:T_COLORS[1]},{v:t2,c:T_COLORS[2]},{v:t3,c:T_COLORS[3]},{v:t4,c:T_COLORS[4]},{v:t5,c:T_COLORS[5]}].map((s,i) => s.v>0 && (
        <div key={i} style={{ width:`${(s.v/safe)*100}%`, background:s.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.52rem', fontWeight:700, color:'white', minWidth:3 }}>
          {(s.v/safe)>0.08 ? s.v : ''}
        </div>
      ))}
    </div>
  );
}

function AbacusTable({ data, totals, onConfirm, onBurst }) {
  const [view, setView] = useState('both');
  const tiers = [1,2,3,4,5];
  const thStyle = { padding:'8px 10px', background:'var(--ink)', color:'rgba(255,255,255,0.6)', fontWeight:600, textAlign:'center', fontSize:'0.6rem', textTransform:'uppercase' };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Abacus Allocation Table</h3>
        <div style={{ display:'flex', gap:4 }}>
          {['both','original','allocated'].map(v => (
            <Button key={v} variant={view === v ? 'primary' : 'surface'} onClick={() => setView(v)} size="sm">{v}</Button>
          ))}
        </div>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem' }}>
          <thead>
            <tr style={{ background: 'var(--ink)', color: 'white' }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Course</th>
              <th style={thStyle}>Status</th>
              {tiers.map(n => <th key={n} style={thStyle}>T{n}</th>)}
              <th style={thStyle}>Elim.</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => {
              const allocTot = [1,2,3,4,5].reduce((s,n)=>s+Number(c[`alloc_t${n}`]||0),0);
              return (
                <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.course_name}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <Badge variant={c.is_burst ? 'red' : allocTot >= c.min_enrollment ? 'green' : 'amber'}>
                      {c.is_burst ? 'BURST' : allocTot >= c.min_enrollment ? 'Viable' : 'Low'}
                    </Badge>
                  </td>
                  {tiers.map(n => (
                    <td key={n} style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{c[`alloc_t${n}`] || '·'}</td>
                  ))}
                  <td style={{ textAlign: 'center', color: '#DC2626', fontWeight: 700 }}>{c.eliminated_count || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {!c.is_burst && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="success" size="sm" onClick={() => onConfirm(c)}>✓</Button>
                        <Button variant="danger" size="sm" onClick={() => onBurst(c)}>✕</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AllocationPanel() {
  const { selectedElection } = useElection();
  const navigate = useNavigate();
  const [abacus, setAbacus]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [msg, setMsg]                     = useState(null);
  const [confirmModal, setConfirmModal]   = useState(null);
  const [burstModal, setBurstModal]       = useState(null);
  const [capacity, setCapacity]           = useState('');

  const load = useCallback(() => {
    if (!selectedElection) {
      navigate('/admin');
      return;
    }
    setLoading(true);
    api.get(`/allocation/${selectedElection.election_id}/abacus`)
      .then(r => setAbacus(r.data))
      .catch(() => setMsg({ type:'error', text:'Load failed.' }))
      .finally(() => setLoading(false));
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    try {
      await api.post('/allocation/confirm', {
        election_id: selectedElection.election_id, course_id: confirmModal.course_id,
        capacity: parseInt(capacity), round_number: 1
      });
      setConfirmModal(null); load();
    } catch (err) { setMsg({ type:'error', text: 'Confirm failed.' }); }
  };

  const handleBurst = async () => {
    try {
      await api.post('/allocation/burst', {
        election_id: selectedElection.election_id, course_id: burstModal.course_id,
        round_number: 1, reason: 'Manual burst'
      });
      setBurstModal(null); load();
    } catch (err) { setMsg({ type:'error', text: 'Burst failed.' }); }
  };

  if (!selectedElection && !loading) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.7rem', fontWeight:800, color:'var(--text)', marginBottom:4 }}>Allocation Panel</h1>
            <p style={{ fontSize:'0.84rem', color:'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {loading ? (
          <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
        ) : (
          <AbacusTable 
            data={abacus?.data || []} 
            totals={abacus?.totals} 
            onConfirm={c => { setConfirmModal(c); setCapacity(String(c.max_enrollment)); }}
            onBurst={c => setBurstModal(c)}
          />
        )}

        {confirmModal && (
          <Modal title={`Confirm: ${confirmModal.course_name}`} onClose={() => setConfirmModal(null)}>
            <div className="form-group">
              <label className="form-label">Confirmation Capacity</label>
              <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="success" onClick={handleConfirm} style={{ flex: 1 }}>Confirm Seats</Button>
              <Button variant="surface" onClick={() => setConfirmModal(null)} style={{ flex: 1 }}>Cancel</Button>
            </div>
          </Modal>
        )}

        {burstModal && (
          <Modal title={`Burst: ${burstModal.course_name}`} onClose={() => setBurstModal(null)}>
            <Alert type="error" style={{ marginBottom: 20 }}>This will eliminate the course and cascade all applicants to their next preference.</Alert>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="danger" onClick={handleBurst} style={{ flex: 1 }}>Confirm Burst</Button>
              <Button variant="surface" onClick={() => setBurstModal(null)} style={{ flex: 1 }}>Cancel</Button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Alert, Spinner, Modal } from '../../components/ui/index';
import api from '../../services/api';

/* ── Tier colours ──────────────────────────────────────────── */
const T_COLORS = ['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'];
const T_BG     = ['','#EEF2FF','#F5F3FF','#FFFBEB','#ECFDF5','#FEF2F2'];

const MethodTag = ({ auto }) => auto
  ? <span style={{ padding:'1px 7px', borderRadius:99, background:'#F5F3FF', color:'#7C3AED', border:'1px solid #DDD6FE', fontSize:'0.62rem', fontWeight:700 }}>Auto</span>
  : <span style={{ padding:'1px 7px', borderRadius:99, background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', fontSize:'0.62rem', fontWeight:700 }}>Self</span>;

/* ── Waterfall bar ─────────────────────────────────────────── */
function WaterfallBar({ t1=0, t2=0, t3=0, t4=0, t5=0, max=1, height=24 }) {
  const safe = max || 1;
  return (
    <div style={{ display:'flex', height, borderRadius:6, overflow:'hidden', background:'var(--muted-bg)', gap:1 }}>
      {[{v:t1,c:T_COLORS[1]},{v:t2,c:T_COLORS[2]},{v:t3,c:T_COLORS[3]},{v:t4,c:T_COLORS[4]},{v:t5,c:T_COLORS[5]}].map((s,i) => s.v>0 && (
        <div key={i} title={`T${i+1}: ${s.v}`} style={{ width:`${(s.v/safe)*100}%`, background:s.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.52rem', fontWeight:700, color:'white', minWidth:3, transition:'width 0.6s ease' }}>
          {(s.v/safe)>0.08 ? s.v : ''}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ABACUS TABLE — Original vs Allocated side by side
   ═══════════════════════════════════════════════════════════ */
function AbacusTable({ data, totals, onConfirm, onBurst }) {
  const [view, setView] = useState('both');
  const tiers = [1,2,3,4,5];
  const thDark = { padding:'8px 10px', background:'var(--ink)', color:'rgba(255,255,255,0.6)', fontWeight:600, textAlign:'center', fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.7px', whiteSpace:'nowrap' };
  const thLeft = { ...thDark, textAlign:'left' };

  return (
    <div style={{ background:'var(--surface)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
      {/* Card header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--text)', marginBottom:2 }}>Abacus Allocation Table</div>
          <div style={{ fontSize:'0.74rem', color:'var(--text-4)' }}>
            <strong style={{ color:'#818CF8' }}>Original</strong> = locked choices at election stop &nbsp;·&nbsp;
            <strong style={{ color:'#34D399' }}>Allocated</strong> = live after confirmations/bursts &nbsp;·&nbsp;
            <strong style={{ color:'#FCA5A5' }}>Eliminated</strong> = cascaded out
          </div>
        </div>
        <div style={{ display:'flex', background:'var(--muted-bg)', borderRadius:10, padding:3, gap:2 }}>
          {[['both','Both'],['original','Original'],['allocated','Allocated']].map(([v,lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding:'5px 12px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.72rem', fontWeight:700, background:view===v?'var(--surface)':'transparent', color:view===v?'var(--text)':'var(--text-4)', boxShadow:view===v?'var(--shadow-xs)':'none', transition:'all 0.15s' }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.79rem' }}>
          <thead>
            {/* Block headers */}
            <tr>
              <th style={{...thLeft, width:170}} rowSpan={2}>Course</th>
              <th style={thDark} rowSpan={2}>Status</th>
              {(view==='both'||view==='original') && (
                <th colSpan={5} style={{...thDark, background:'#1a1f3d', color:'#818CF8', borderLeft:'2px solid #4F46E5'}}>ORIGINAL</th>
              )}
              {view==='both' && <th rowSpan={2} style={{...thDark, background:'#0e1428', width:20, padding:'8px 2px', fontSize:'0.5rem', color:'rgba(255,255,255,0.2)'}}>→</th>}
              {(view==='both'||view==='allocated') && (
                <th colSpan={5} style={{...thDark, background:'#0d2d1a', color:'#34D399', borderLeft:view==='allocated'?'none':'2px solid #059669'}}>ALLOCATED</th>
              )}
              <th style={{...thDark, background:'#2d0d0d', color:'#FCA5A5', borderLeft:'2px solid #DC2626'}} rowSpan={2}>Elim.</th>
              <th style={thDark} rowSpan={2}>Distribution</th>
              <th style={thDark} rowSpan={2}>Actions</th>
            </tr>
            {/* Tier labels */}
            <tr>
              {(view==='both'||view==='original') && tiers.map(n => (
                <th key={`oh${n}`} style={{...thDark, background:'#1a1f3d', color:T_COLORS[n], borderLeft:n===1?'2px solid rgba(79,70,229,0.4)':'none', padding:'5px 10px'}}>T{n}</th>
              ))}
              {(view==='both'||view==='allocated') && tiers.map(n => (
                <th key={`ah${n}`} style={{...thDark, background:'#0d2d1a', color:T_COLORS[n], borderLeft:n===1?'2px solid rgba(5,150,105,0.4)':'none', padding:'5px 10px'}}>T{n}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((c, idx) => {
              const isBurst   = !!c.is_burst;
              const allocTot  = [1,2,3,4,5].reduce((s,n)=>s+Number(c[`alloc_t${n}`]||0),0);
              const viable    = !isBurst && allocTot >= Number(c.min_enrollment);
              const eliminated= Number(c.eliminated_count||0);
              const rowBg     = isBurst ? 'rgba(220,38,38,0.04)' : idx%2===0 ? 'var(--surface)' : 'var(--muted-bg)';

              return (
                <tr key={c.course_id} style={{ borderBottom:'1px solid var(--border)', background:rowBg, opacity:isBurst?0.65:1 }}>
                  {/* Name */}
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ fontWeight:700, color:isBurst?'#FCA5A5':'var(--text)', fontSize:'0.79rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:165 }}>{c.course_name}</div>
                    {c.subject_code && <div style={{ fontSize:'0.58rem', fontFamily:'var(--mono)', color:'var(--text-4)' }}>{c.subject_code}</div>}
                  </td>

                  {/* Status */}
                  <td style={{ padding:'10px 8px', textAlign:'center' }}>
                    {isBurst ? (
                      <span style={{ fontSize:'0.6rem', background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:6, padding:'2px 7px', fontWeight:700 }}>BURST</span>
                    ) : viable ? (
                      <span style={{ fontSize:'0.6rem', background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', borderRadius:6, padding:'2px 7px', fontWeight:700 }}>Viable</span>
                    ) : (
                      <span style={{ fontSize:'0.6rem', background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A', borderRadius:6, padding:'2px 7px', fontWeight:700 }}>Low</span>
                    )}
                  </td>

                  {/* Original T1–T5 */}
                  {(view==='both'||view==='original') && tiers.map(n => {
                    const v = Number(c[`orig_t${n}`]||0);
                    return (
                      <td key={`o${n}`} style={{ padding:'10px 8px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:v>0?800:400, color:v>0?T_COLORS[n]:'rgba(120,120,180,0.25)', background:'rgba(79,70,229,0.03)', borderLeft:n===1?'2px solid rgba(79,70,229,0.15)':'none', fontSize:'0.82rem' }}>
                        {v||'·'}
                      </td>
                    );
                  })}

                  {/* Separator */}
                  {view==='both' && <td style={{ background:'rgba(79,70,229,0.04)', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:'0.62rem' }}>→</td>}

                  {/* Allocated T1–T5 */}
                  {(view==='both'||view==='allocated') && tiers.map(n => {
                    const orig  = Number(c[`orig_t${n}`]||0);
                    const alloc = isBurst ? 0 : Number(c[`alloc_t${n}`]||0);
                    const diff  = alloc - orig;
                    return (
                      <td key={`a${n}`} style={{ padding:'10px 8px', textAlign:'center', background:'rgba(5,150,105,0.04)', borderLeft:n===1?'2px solid rgba(5,150,105,0.15)':'none' }}>
                        <div style={{ fontFamily:'var(--mono)', fontWeight:alloc>0?800:400, color:alloc>0?T_COLORS[n]:'rgba(80,180,120,0.25)', fontSize:'0.82rem' }}>
                          {alloc||'·'}
                        </div>
                        {!isBurst && diff!==0 && (
                          <div style={{ fontSize:'0.52rem', fontFamily:'var(--mono)', color:diff>0?'#34D399':'#FCA5A5', fontWeight:800, lineHeight:1 }}>
                            {diff>0?'+':''}{diff}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Eliminated */}
                  <td style={{ padding:'10px 8px', textAlign:'center', background:'rgba(220,38,38,0.04)', borderLeft:'2px solid rgba(220,38,38,0.12)' }}>
                    {eliminated>0
                      ? <span style={{ fontFamily:'var(--mono)', fontWeight:800, color:'#DC2626', fontSize:'0.88rem' }}>{eliminated}</span>
                      : <span style={{ color:'rgba(200,100,100,0.2)', fontFamily:'var(--mono)' }}>0</span>}
                  </td>

                  {/* Distribution */}
                  <td style={{ padding:'10px 12px', minWidth:130 }}>
                    <WaterfallBar
                      t1={isBurst?0:Number(c.alloc_t1||0)} t2={isBurst?0:Number(c.alloc_t2||0)}
                      t3={isBurst?0:Number(c.alloc_t3||0)} t4={isBurst?0:Number(c.alloc_t4||0)}
                      t5={isBurst?0:Number(c.alloc_t5||0)} max={Number(c.max_enrollment||1)} height={22} />
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.55rem', color:'var(--text-4)', marginTop:2 }}>
                      <span>min {c.min_enrollment}</span>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:viable?'#059669':'#D97706' }}>
                        {isBurst?'burst':`${allocTot}/${c.max_enrollment}`}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                    {!isBurst && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => onConfirm(c)}
                          style={{ padding:'5px 11px', borderRadius:8, background:'linear-gradient(135deg,#059669,#10B981)', color:'white', border:'none', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'var(--font)' }}
                          title="Confirm course">✓</button>
                        <button onClick={() => onBurst(c)}
                          style={{ padding:'5px 11px', borderRadius:8, background:'linear-gradient(135deg,#DC2626,#EF4444)', color:'white', border:'none', fontWeight:700, fontSize:'0.72rem', cursor:'pointer', fontFamily:'var(--font)' }}
                          title="Burst course">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          {totals && (
            <tfoot>
              <tr style={{ background:'var(--ink)' }}>
                <td style={{ padding:'9px 12px', fontWeight:800, color:'rgba(255,255,255,0.65)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>TOTALS</td>
                <td />
                {(view==='both'||view==='original') && tiers.map(n => (
                  <td key={`ot${n}`} style={{ padding:'9px 8px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:800, color:T_COLORS[n], background:'rgba(79,70,229,0.1)', borderLeft:n===1?'2px solid rgba(79,70,229,0.3)':'none', fontSize:'0.82rem' }}>
                    {totals[`orig_t${n}`]||0}
                  </td>
                ))}
                {view==='both' && <td style={{ background:'#0e1428' }}/>}
                {(view==='both'||view==='allocated') && tiers.map(n => (
                  <td key={`at${n}`} style={{ padding:'9px 8px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:800, color:T_COLORS[n], background:'rgba(5,150,105,0.1)', borderLeft:n===1?'2px solid rgba(5,150,105,0.3)':'none', fontSize:'0.82rem' }}>
                    {totals[`alloc_t${n}`]||0}
                  </td>
                ))}
                <td style={{ padding:'9px 8px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:800, color:'#FCA5A5', background:'rgba(220,38,38,0.1)', borderLeft:'2px solid rgba(220,38,38,0.3)', fontSize:'0.88rem' }}>
                  {totals.eliminated_count||0}
                </td>
                <td /><td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALTER-TABLE STEP HISTORY
   ═══════════════════════════════════════════════════════════ */
function StepHistory({ steps }) {
  const [expanded, setExpanded] = useState(null);

  if (!steps.length) return (
    <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', padding:'40px 24px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:14 }}>📋</div>
      <div style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text)', marginBottom:6 }}>No steps recorded yet</div>
      <p style={{ fontSize:'0.78rem', color:'var(--text-3)', lineHeight:1.7, maxWidth:400, margin:'0 auto' }}>
        Each Confirm or Burst action on the Abacus Table creates a numbered step here — exactly like an "Alter Table" history. A full snapshot of the token distribution is saved at every step, so you can trace exactly how the allocation evolved.
      </p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Legend */}
      <div style={{ display:'flex', gap:18, padding:'12px 16px', background:'var(--muted-bg)', borderRadius:12, fontSize:'0.75rem', color:'var(--text-3)' }}>
        <span>📋 <strong style={{color:'var(--text)'}}>Step History</strong> — click any step to expand and see the full distribution snapshot at that point in time</span>
        <span style={{ marginLeft:'auto' }}>{steps.length} step{steps.length!==1?'s':''} recorded</span>
      </div>

      {steps.map(step => {
        const isBurst = step.action_type === 'BURST';
        const color   = isBurst ? '#DC2626' : '#059669';
        const bg      = isBurst ? '#FEF2F2' : '#ECFDF5';
        const border  = isBurst ? '#FECACA' : '#A7F3D0';
        const isOpen  = expanded === step.step_id;

        return (
          <div key={step.step_id} style={{ borderRadius:16, border:`1.5px solid ${isOpen?color:border}`, overflow:'hidden', background:'var(--surface)', boxShadow:'var(--shadow-sm)', transition:'border-color 0.2s' }}>
            {/* Step row */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer', background: isOpen ? bg : 'var(--surface)', transition:'background 0.2s' }}
              onClick={() => setExpanded(isOpen ? null : step.step_id)}>
              {/* Number badge */}
              <div style={{ width:36, height:36, borderRadius:10, background:color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.9rem', flexShrink:0, boxShadow:`0 2px 8px ${color}44` }}>
                {step.step_number}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:800, fontSize:'0.84rem', color, textTransform:'uppercase', letterSpacing:'0.3px' }}>
                    {isBurst ? '✕ Burst' : '✓ Confirm'}
                  </span>
                  <span style={{ fontWeight:700, fontSize:'0.87rem', color:'var(--text)' }}>{step.course_name}</span>
                  {isBurst ? (
                    <span style={{ fontSize:'0.66rem', background:bg, color, border:`1px solid ${border}`, borderRadius:99, padding:'1px 9px', fontWeight:700, flexShrink:0 }}>
                      {step.cascade_count} cascaded out
                    </span>
                  ) : (
                    <>
                      <span style={{ fontSize:'0.66rem', background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', borderRadius:99, padding:'1px 9px', fontWeight:700, flexShrink:0 }}>{step.confirm_count} confirmed</span>
                      {step.cascade_count > 0 && <span style={{ fontSize:'0.66rem', background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:99, padding:'1px 9px', fontWeight:700, flexShrink:0 }}>{step.cascade_count} cascaded</span>}
                    </>
                  )}
                </div>
                {step.reason && (
                  <div style={{ fontSize:'0.72rem', color:'var(--text-3)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    "{step.reason}"
                  </div>
                )}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <div style={{ fontSize:'0.66rem', color:'var(--text-4)', fontFamily:'var(--mono)' }}>
                  {new Date(step.created_at).toLocaleTimeString()}
                </div>
                <span style={{ color:'var(--text-4)', fontSize:'0.75rem', transition:'transform 0.2s', display:'inline-block', transform: isOpen?'rotate(180deg)':'none' }}>▾</span>
              </div>
            </div>

            {/* Snapshot table */}
            {isOpen && step.snapshot && step.snapshot.length > 0 && (
              <div style={{ borderTop:`1.5px solid ${border}`, background: isBurst?'#fff8f8':'#f0fdf4', overflowX:'auto' }}>
                <div style={{ padding:'10px 18px 6px', fontSize:'0.7rem', color:'var(--text-3)', fontWeight:600 }}>
                  Distribution snapshot at Step {step.step_number} — {new Date(step.created_at).toLocaleString()}
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.76rem' }}>
                  <thead>
                    <tr>
                      {['Course','T1','T2','T3','T4','T5','Allocated','Eliminated'].map(h => (
                        <th key={h} style={{ padding:'7px 12px', background:color+'22', color, fontWeight:700, textAlign:h==='Course'?'left':'center', fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {step.snapshot.map((row, i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${border}88`, background: row.is_burst?'#fef2f2' : i%2===0?'white':color+'08' }}>
                        <td style={{ padding:'7px 12px', fontWeight:700, color:row.is_burst?'#DC2626':'var(--text)' }}>{row.course_name}</td>
                        {[1,2,3,4,5].map(n => (
                          <td key={n} style={{ padding:'7px 12px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:Number(row[`t${n}`]||0)>0?800:400, color:Number(row[`t${n}`]||0)>0?T_COLORS[n]:'var(--text-4)' }}>
                            {Number(row[`t${n}`]||0)||'·'}
                          </td>
                        ))}
                        <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, color:'#059669' }}>{row.allocated||0}</td>
                        <td style={{ padding:'7px 12px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, color:'#DC2626' }}>{row.burst_total||0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */
export default function AllocationPanel() {
  const [sp] = useSearchParams();
  const [elections, setElections]         = useState([]);
  const [electionId, setElectionId]       = useState(sp.get('id') || '');
  const [abacus, setAbacus]               = useState(null);
  const [steps, setSteps]                 = useState([]);
  const [loading, setLoading]             = useState(false);
  const [stepsLoading, setStepsLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [msg, setMsg]                     = useState(null);
  const [verifyResult, setVerifyResult]   = useState(null);
  const [roundNum, setRoundNum]           = useState(1);
  const [tab, setTab]                     = useState('abacus');
  const [confirmModal, setConfirmModal]   = useState(null);
  const [burstModal, setBurstModal]       = useState(null);
  const [capacity, setCapacity]           = useState('');
  const [burstReason, setBurstReason]     = useState('');
  const [unallocated, setUnallocated]     = useState([]);
  const [uloading, setUloading]           = useState(false);
  const [arrangeOrder, setArrangeOrder]   = useState('name');
  const [arranging, setArranging]         = useState(false);

  useEffect(() => {
    api.get('/elections').then(r => {
      const list = r.data.data || [];
      setElections(list);
      if (!electionId) {
        const stopped = list.find(e => e.status === 'STOPPED');
        if (stopped) setElectionId(String(stopped.election_id));
      }
    });
  }, []); // eslint-disable-line

  const loadAbacus = useCallback(() => {
    if (!electionId) return;
    setLoading(true);
    api.get(`/allocation/${electionId}/abacus`)
      .then(r => setAbacus(r.data))
      .catch(() => setMsg({ type:'error', text:'Failed to load allocation table.' }))
      .finally(() => setLoading(false));
  }, [electionId]);

  const loadSteps = useCallback(() => {
    if (!electionId) return;
    setStepsLoading(true);
    api.get(`/allocation/${electionId}/steps`)
      .then(r => setSteps(r.data.data || []))
      .finally(() => setStepsLoading(false));
  }, [electionId]);

  const loadUnallocated = useCallback(() => {
    if (!electionId) return;
    setUloading(true);
    api.get(`/allocation/${electionId}/unallocated`)
      .then(r => setUnallocated(r.data.data || []))
      .catch(() => {})
      .finally(() => setUloading(false));
  }, [electionId]);

  useEffect(() => {
    if (electionId) { loadAbacus(); loadSteps(); }
  }, [electionId, loadAbacus, loadSteps]);

  useEffect(() => {
    if (tab === 'unallocated') loadUnallocated();
  }, [tab, loadUnallocated]);

  const handleConfirm = async () => {
    setActionLoading('confirm'); setMsg(null);
    try {
      const { data } = await api.post('/allocation/confirm', {
        election_id: parseInt(electionId), course_id: confirmModal.course_id,
        capacity: parseInt(capacity), round_number: roundNum,
      });
      setMsg({ type:'success', text:`✓ ${confirmModal.course_name}: ${data.confirmed} confirmed, ${data.burst} cascaded.` });
      setConfirmModal(null); loadAbacus(); loadSteps();
    } catch (err) { setMsg({ type:'error', text: err.response?.data?.message || 'Confirm failed.' }); }
    finally { setActionLoading(''); }
  };

  const handleBurst = async () => {
    setActionLoading('burst'); setMsg(null);
    try {
      const { data } = await api.post('/allocation/burst', {
        election_id: parseInt(electionId), course_id: burstModal.course_id,
        round_number: roundNum, reason: burstReason,
      });
      setMsg({ type:'success', text:`✕ ${data.course_name} burst. ${data.burst_count} cascaded. Reason saved.` });
      setBurstModal(null); loadAbacus(); loadSteps();
    } catch (err) { setMsg({ type:'error', text: err.response?.data?.message || 'Burst failed.' }); }
    finally { setActionLoading(''); }
  };

  const handleVerify = async () => {
    setActionLoading('verify');
    try { const { data } = await api.get(`/allocation/${electionId}/verify`); setVerifyResult(data); }
    catch { setMsg({ type:'error', text:'Verification failed.' }); }
    finally { setActionLoading(''); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('ucos_token');
    const base  = '/api';
    fetch(`${base}/allocation/${electionId}/export`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.blob()).then(blob => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `ucos_allocation_${electionId}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }).catch(() => setMsg({ type:'error', text:'Export failed.' }));
  };

  const handleEmail = async () => {
    if (!window.confirm('Send result emails to all students?')) return;
    setActionLoading('email');
    try { const { data } = await api.post(`/allocation/${electionId}/email`); setMsg({ type:'success', text: data.message }); }
    catch { setMsg({ type:'error', text:'Email send failed.' }); }
    finally { setActionLoading(''); }
  };

  const handleArrange = async () => {
    if (!window.confirm(`Auto-arrange ${unallocated.length} students by ${arrangeOrder}?`)) return;
    setArranging(true);
    try {
      const { data } = await api.post(`/allocation/${electionId}/arrange`, { order: arrangeOrder });
      setMsg({ type:'success', text: data.message });
      loadUnallocated(); loadAbacus();
    } catch (err) { setMsg({ type:'error', text: err.response?.data?.message || 'Arrange failed.' }); }
    finally { setArranging(false); }
  };

  const calcAllocTot = c => [1,2,3,4,5].reduce((s,n)=>s+Number(c[`alloc_t${n}`]||0),0);

  const activeCount = (abacus?.data||[]).filter(c=>!c.is_burst).length;
  const burstCount  = (abacus?.data||[]).filter(c=>c.is_burst).length;
  const totalAlloc  = (abacus?.data||[]).reduce((s,c)=>s+(c.is_burst?0:calcAllocTot(c)),0);
  const totalElim   = abacus?.totals?.eliminated_count||0;
  const totalOrig   = abacus?.totals?.orig_total||0;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.7rem', fontWeight:800, letterSpacing:'-0.6px', color:'var(--text)', marginBottom:4 }}>Allocation Panel</h1>
            <p style={{ fontSize:'0.84rem', color:'var(--text-3)' }}>PWFCFS-MRA · Abacus table with Original / Allocated trackers and full step history</p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <select value={electionId} onChange={e => { setElectionId(e.target.value); setAbacus(null); setSteps([]); setVerifyResult(null); }}
              style={{ padding:'8px 12px', borderRadius:10, border:'1.5px solid var(--border)', fontSize:'0.85rem', fontFamily:'var(--font)', color:'var(--text)', background:'var(--surface)', outline:'none', minWidth:220 }}>
              <option value="">— Select Election —</option>
              {elections.map(e => <option key={e.election_id} value={e.election_id}>{e.election_name} ({e.status})</option>)}
            </select>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:10, padding:'6px 12px' }}>
              <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Round</span>
              <input type="number" min="1" value={roundNum} onChange={e=>setRoundNum(Math.max(1,parseInt(e.target.value)||1))}
                style={{ width:44, border:'none', outline:'none', fontFamily:'var(--mono)', fontWeight:800, fontSize:'1rem', background:'transparent', color:'var(--accent)', textAlign:'center' }} />
            </div>
            <button onClick={() => { loadAbacus(); loadSteps(); }} disabled={loading}
              style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.82rem', fontWeight:600 }}>
              {loading ? <Spinner dark /> : '↻'}
            </button>
          </div>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}
        {!electionId && <div className="alert alert-warning">Select a stopped election to begin allocation.</div>}

        {electionId && (
          <>
            {/* Stats */}
            {abacus && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:22 }}>
                {[
                  { label:'Original Total', v:totalOrig,   color:'#4F46E5' },
                  { label:'Active Courses', v:activeCount,  color:'#059669' },
                  { label:'Burst Courses',  v:burstCount,   color:'#DC2626' },
                  { label:'Live Allocated', v:totalAlloc,   color:'#7C3AED' },
                  { label:'Total Eliminated', v:totalElim,  color:'#D97706' },
                ].map(s => (
                  <div key={s.label} style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, borderRadius:'14px 14px 0 0' }} />
                    <div style={{ fontSize:'0.64rem', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5 }}>{s.label}</div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:800, color:s.color, letterSpacing:'-1px', lineHeight:1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab bar */}
            <div style={{ display:'flex', gap:4, background:'var(--muted-bg)', borderRadius:12, padding:4, marginBottom:22, width:'fit-content', flexWrap:'wrap' }}>
              {[
                { id:'abacus',      label:'⊞ Abacus Table' },
                { id:'steps',       label:`📋 Step History (${steps.length})` },
                { id:'unallocated', label:'⚠ Unallocated' },
                { id:'publish',     label:'✓ Verify & Publish' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding:'8px 16px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.8rem', fontWeight:700, background:tab===t.id?'var(--surface)':'transparent', color:tab===t.id?'var(--text)':'var(--text-4)', boxShadow:tab===t.id?'var(--shadow-xs)':'none', transition:'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Abacus Tab ── */}
            {tab === 'abacus' && (
              loading ? <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
              : abacus ? (
                <AbacusTable data={abacus.data||[]} totals={abacus.totals}
                  onConfirm={c => { setConfirmModal(c); setCapacity(String(Math.min(c.max_enrollment, calcAllocTot(c)))); }}
                  onBurst={c => {
                    setBurstModal(c);
                    setBurstReason(`Eliminated due to insufficient enrolment — only ${calcAllocTot(c)} of ${c.min_enrollment} minimum required.`);
                  }}
                />
              ) : <div className="alert alert-warning">No data. Select an election.</div>
            )}

            {/* ── Steps Tab ── */}
            {tab === 'steps' && (
              stepsLoading ? <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
              : <StepHistory steps={steps} />
            )}

            {/* ── Unallocated Tab ── */}
            {tab === 'unallocated' && (
              <div>
                <div style={{ background:'var(--surface)', borderRadius:20, padding:'24px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', marginBottom:20 }}>
                  <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text)', marginBottom:6 }}>Manual Seat Arrangement</div>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-3)', lineHeight:1.7, marginBottom:16 }}>
                    Students with unused tokens after the election stopped. Assign them remaining seats in the chosen order.
                  </p>
                  {unallocated.length > 0 ? (
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-3)' }}>Order:</span>
                      {[['name','Alphabetical'],['register_number','Register No.']].map(([v,lbl]) => (
                        <button key={v} onClick={() => setArrangeOrder(v)}
                          style={{ padding:'5px 12px', borderRadius:9, border:`1.5px solid ${arrangeOrder===v?'var(--accent)':'var(--border)'}`, cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.76rem', fontWeight:700, background:arrangeOrder===v?'var(--accent-light)':'var(--surface)', color:arrangeOrder===v?'var(--accent)':'var(--text-3)', transition:'all 0.15s' }}>
                          {lbl}
                        </button>
                      ))}
                      <button className="btn btn-warning" onClick={handleArrange} disabled={arranging} style={{ marginLeft:'auto' }}>
                        {arranging ? <Spinner/> : `⚡ Arrange ${unallocated.length} Students`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding:'14px', background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, fontSize:'0.84rem', color:'#065F46', fontWeight:600 }}>
                      ✅ All students allocated.
                    </div>
                  )}
                </div>
                {uloading ? <div style={{ textAlign:'center', padding:40 }}><Spinner dark /></div>
                : unallocated.length > 0 && (
                  <div style={{ background:'var(--surface)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
                    <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Students with Unused Tokens</span>
                      <span style={{ background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A', borderRadius:99, padding:'3px 12px', fontSize:'0.72rem', fontWeight:700 }}>{unallocated.length}</span>
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                      <thead>
                        <tr>{['#','Name','Reg No.','Section','Email','Unused','Pending Courses'].map(h=>(
                          <th key={h} style={{ padding:'9px 14px', background:'var(--ink)', color:'rgba(255,255,255,0.6)', fontWeight:600, textAlign:'left', fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.8px' }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {unallocated.map((s,i) => (
                          <tr key={s.student_id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'var(--surface)':'var(--muted-bg)' }}>
                            <td style={{ padding:'9px 14px', color:'var(--text-4)', fontFamily:'var(--mono)', fontSize:'0.74rem' }}>{i+1}</td>
                            <td style={{ padding:'9px 14px', fontWeight:700 }}>{s.name}</td>
                            <td style={{ padding:'9px 14px' }}><span className="code-chip" style={{fontSize:'0.7rem'}}>{s.register_number}</span></td>
                            <td style={{ padding:'9px 14px' }}><span className="badge badge-blue">Sec {s.section}</span></td>
                            <td style={{ padding:'9px 14px', fontSize:'0.76rem', color:'var(--text-3)' }}>{s.email}</td>
                            <td style={{ padding:'9px 14px', textAlign:'center' }}><span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:'1.1rem', color:'#D97706' }}>{s.unused_count}</span></td>
                            <td style={{ padding:'9px 14px', fontSize:'0.74rem', color:'var(--text-3)', maxWidth:180 }}><span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.pending_courses||'—'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Publish Tab ── */}
            {tab === 'publish' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {[
                  { step:'1', title:'Verify Allocation', desc:'Check every student has the required number of confirmed courses.', action: <button className="btn btn-primary" onClick={handleVerify} disabled={actionLoading==='verify'}>{actionLoading==='verify'?<Spinner/>:'✓ Run Verification'}</button> },
                  { step:'2', title:'Download CSV', desc:'Export full results as CSV. For class-wise CSVs by section, use the Results page → Allocation Sessions.', action: <button className="btn btn-success" onClick={handleExport}>⬇ Download CSV</button> },
                  { step:'3', title:'Email Students', desc:'Send result notification emails to all students.', action: <button className="btn btn-primary" onClick={handleEmail} disabled={actionLoading==='email'}>{actionLoading==='email'?<Spinner/>:'✉ Email All Students'}</button> },
                ].map(s => (
                  <div key={s.step} style={{ background:'var(--surface)', borderRadius:18, padding:'22px 26px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', display:'flex', gap:18, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.1rem', flexShrink:0 }}>{s.step}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text)', marginBottom:4 }}>{s.title}</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-3)', lineHeight:1.6 }}>{s.desc}</div>
                    </div>
                    {s.action}
                  </div>
                ))}
                {verifyResult && (
                  <div className={`alert ${verifyResult.verified?'alert-success':'alert-error'}`}>
                    {verifyResult.verified
                      ? `✓ Verified! ${verifyResult.total_students} students × ${verifyResult.required_per_student} courses = ${verifyResult.total_confirmed} allocations complete.`
                      : `⚠ ${verifyResult.flagged_students?.length||0} students have incomplete allocation.`}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ CONFIRM MODAL ══ */}
        {confirmModal && (
          <Modal title={`Confirm: ${confirmModal.course_name}`} onClose={() => setConfirmModal(null)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setConfirmModal(null)}>Cancel</button><button className="btn btn-success" onClick={handleConfirm} disabled={actionLoading==='confirm'}>{actionLoading==='confirm'?<Spinner/>:'✓ Confirm Course'}</button></>}>
            <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:'0.84rem', color:'#065F46', lineHeight:1.7 }}>
              Min enrolment: <strong>{confirmModal.min_enrollment}</strong> &nbsp;·&nbsp; Max: <strong>{confirmModal.max_enrollment}</strong> &nbsp;·&nbsp; Currently allocated: <strong>{calcAllocTot(confirmModal)}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Seats to Confirm</label>
              <input className="form-input" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min="1" max={confirmModal.max_enrollment} />
              <div className="form-hint">Top {capacity||0} students (by FCFS seat order) are confirmed. Any beyond capacity cascade to their next token preference. Tags (Self/Auto) are preserved.</div>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:'0.76rem', color:'var(--text-3)', marginTop:6 }}>
              <MethodTag auto={false} /> <span>= student booked themselves</span>
              <span style={{ marginLeft:12 }}><MethodTag auto={true} /></span> <span>= auto-assigned by system</span>
            </div>
          </Modal>
        )}

        {/* ══ BURST MODAL ══ */}
        {burstModal && (
          <Modal title="✕ Burst / Eliminate Course" onClose={() => setBurstModal(null)}
            footer={<><button className="btn btn-ghost btn-sm" onClick={() => setBurstModal(null)}>Cancel</button><button className="btn btn-danger" onClick={handleBurst} disabled={actionLoading==='burst'}>{actionLoading==='burst'?<Spinner/>:'✕ Confirm Burst'}</button></>}>

            <div style={{ background:'linear-gradient(135deg, #0A0F1E, #1a1f35)', borderRadius:14, padding:'16px 20px', marginBottom:18, border:'1px solid rgba(220,38,38,0.25)' }}>
              <div style={{ fontSize:'0.6rem', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>
                {burstModal.subject_code || 'COURSE'}
              </div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color:'white', marginBottom:8 }}>{burstModal.course_name}</div>
              <div style={{ display:'flex', gap:16, fontSize:'0.75rem', flexWrap:'wrap' }}>
                {[
                  ['Currently enrolled', calcAllocTot(burstModal), '#FCA5A5'],
                  ['Min required',       burstModal.min_enrollment,  '#FCD34D'],
                  ['Max capacity',       burstModal.max_enrollment,   'rgba(255,255,255,0.6)'],
                ].map(([lbl,v,c]) => (
                  <span key={lbl} style={{ color:'rgba(255,255,255,0.45)' }}>{lbl}: <strong style={{ color:c }}>{v}</strong></span>
                ))}
              </div>
            </div>

            <div style={{ background:'#FFF8F0', border:'1px solid #FDE68A', borderRadius:12, padding:'12px 16px', marginBottom:18, fontSize:'0.78rem', color:'#92400E', lineHeight:1.7 }}>
              <strong>Abacus cascade:</strong> Every student who booked this course has their token for it marked BURST. By gravity — like beads on an abacus — their next preference moves up (T2→T1, T3→T2, etc). The <strong>Allocated</strong> tracker updates. A numbered snapshot is saved to Step History automatically.
            </div>

            <div className="form-group">
              <label className="form-label">Reason for elimination</label>
              <textarea className="form-input" rows={3} value={burstReason} onChange={e => setBurstReason(e.target.value)}
                style={{ resize:'vertical', fontFamily:'var(--font)', lineHeight:1.6 }} />
              <div className="form-hint">Pre-filled automatically. Edit before confirming — this appears in the Step History and all reports.</div>
            </div>

            <div className="alert alert-error" style={{ marginBottom:0 }}>
              <strong>Cannot be undone.</strong> All {calcAllocTot(burstModal)} enrolled students will cascade to their next preferences.
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

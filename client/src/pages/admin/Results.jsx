import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, EmptyState } from '../../components/ui/index';
import api from '../../services/api';

/* ── Token tier pill ─────────────────────────────────────────── */
function TierPill({ n }) {
  const colors = ['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'];
  const bg     = ['','#EEF2FF','#F5F3FF','#FFFBEB','#ECFDF5','#FEF2F2'];
  return (
    <span style={{ padding: '2px 9px', borderRadius: 99, background: bg[n]||bg[1], color: colors[n]||colors[1], fontWeight: 800, fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
      T{n}
    </span>
  );
}

/* ── Method tag ──────────────────────────────────────────────── */
function MethodTag({ auto, overridden }) {
  if (overridden) return <span style={{ padding:'2px 8px', borderRadius:99, background:'#FFF7ED', color:'#C2410C', border:'1px solid #FED7AA', fontSize:'0.65rem', fontWeight:700 }}>Override</span>;
  if (auto)       return <span style={{ padding:'2px 8px', borderRadius:99, background:'#F5F3FF', color:'#7C3AED', border:'1px solid #DDD6FE', fontSize:'0.65rem', fontWeight:700 }}>Auto</span>;
  return             <span style={{ padding:'2px 8px', borderRadius:99, background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', fontSize:'0.65rem', fontWeight:700 }}>Self</span>;
}

/* ── Choice results summary table ────────────────────────────── */
function ChoiceResultsTable({ summary }) {
  const maxToken = 5;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
        <thead>
          <tr>
            <th style={th}>Course</th>
            <th style={th}>Code</th>
            {Array.from({length: maxToken}, (_,i) => (
              <th key={i} style={{...th, textAlign:'center', color: ['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'][i+1] }}>T{i+1}</th>
            ))}
            <th style={{...th, textAlign:'center'}}>Total</th>
            <th style={{...th, textAlign:'center'}}>Self</th>
            <th style={{...th, textAlign:'center'}}>Auto</th>
            <th style={th}>Distribution</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(c => {
            const max = Math.max(c.total, 1);
            const viable = c.total >= c.min_enrollment;
            return (
              <tr key={c.course_id} style={{ borderBottom: '1px solid var(--border)', background: c.is_burst ? '#FFF5F5' : viable ? '#F0FDF9' : 'var(--surface)' }}>
                <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)', maxWidth: 200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {c.is_burst && <span style={{ fontSize:'0.62rem', background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:6, padding:'1px 6px', fontWeight:700 }}>BURST</span>}
                    {c.course_name}
                  </div>
                </td>
                <td style={{ padding:'11px 14px' }}><span className="code-chip" style={{fontSize:'0.72rem'}}>{c.subject_code||'—'}</span></td>
                {[c.t1,c.t2,c.t3,c.t4,c.t5].map((v,i) => (
                  <td key={i} style={{ padding:'11px 14px', textAlign:'center', fontFamily:'var(--mono)', fontWeight: v>0?800:400, color: v>0?(['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'][i+1]):'var(--text-4)' }}>{v||'—'}</td>
                ))}
                <td style={{ padding:'11px 14px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:800, fontSize:'1rem', color: viable?'#059669':'#D97706' }}>{c.total}</td>
                <td style={{ padding:'11px 14px', textAlign:'center', fontFamily:'var(--mono)', color:'#059669' }}>{c.self_count}</td>
                <td style={{ padding:'11px 14px', textAlign:'center', fontFamily:'var(--mono)', color:'#7C3AED' }}>{c.auto_count}</td>
                <td style={{ padding:'11px 14px', minWidth:140 }}>
                  <div style={{ height:10, borderRadius:6, background:'var(--muted-bg)', overflow:'hidden', display:'flex' }}>
                    {[
                      {v:c.t1||0, c:'#4F46E5'},{v:c.t2||0, c:'#7C3AED'},
                      {v:c.t3||0, c:'#D97706'},{v:c.t4||0, c:'#059669'},{v:c.t5||0, c:'#DC2626'},
                    ].map((s,i) => s.v > 0 && (
                      <div key={i} style={{ width:`${(s.v/max)*100}%`, background:s.c, transition:'width 0.8s ease', minWidth:2 }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'var(--text-4)', marginTop:2 }}>
                    <span>min {c.min_enrollment}</span><span>max {c.max_enrollment}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Totals row */}
        <tfoot>
          <tr style={{ background: 'var(--ink)', color:'rgba(255,255,255,0.7)' }}>
            <td colSpan={2} style={{ padding:'10px 14px', fontWeight:700, fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>TOTALS</td>
            {[1,2,3,4,5].map(n => (
              <td key={n} style={{ padding:'10px 14px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, color:'rgba(255,255,255,0.85)' }}>
                {summary.reduce((s,c) => s+(c[`t${n}`]||0), 0)||'—'}
              </td>
            ))}
            <td style={{ padding:'10px 14px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:800, color:'#34D399' }}>{summary.reduce((s,c)=>s+c.total,0)}</td>
            <td style={{ padding:'10px 14px', textAlign:'center', fontFamily:'var(--mono)', color:'#34D399' }}>{summary.reduce((s,c)=>s+c.self_count,0)}</td>
            <td style={{ padding:'10px 14px', textAlign:'center', fontFamily:'var(--mono)', color:'#A78BFA' }}>{summary.reduce((s,c)=>s+c.auto_count,0)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── Session card ────────────────────────────────────────────── */
function SessionCard({ session, onSelect, onFinalize, selected }) {
  return (
    <div onClick={() => onSelect(session)} style={{
      background: selected ? '#EEF2FF' : 'var(--surface)',
      border: `1.5px solid ${selected ? 'var(--accent)' : session.is_final ? '#A7F3D0' : 'var(--border)'}`,
      borderRadius: 14, padding:'16px 20px', cursor:'pointer',
      boxShadow: selected ? '0 0 0 3px var(--accent-glow)' : 'var(--shadow-sm)',
      transition: 'all 0.2s', position:'relative', overflow:'hidden',
    }}>
      {session.is_final && (
        <div style={{ position:'absolute', top:0, right:0, background:'#059669', color:'white', fontSize:'0.6rem', fontWeight:800, padding:'3px 10px', borderRadius:'0 14px 0 8px', letterSpacing:'0.5px' }}>FINAL</div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text)', paddingRight:60 }}>{session.session_name}</div>
        <div style={{ fontSize:'0.68rem', color:'var(--text-4)', fontFamily:'var(--mono)', flexShrink:0 }}>
          {new Date(session.created_at).toLocaleDateString()}
        </div>
      </div>
      {session.notes && (
        <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginBottom:8, lineHeight:1.5 }}>{session.notes}</div>
      )}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:'0.7rem', color:'var(--text-4)' }}>{session.override_count} overrides</span>
        {session.finalized_at && <span style={{ fontSize:'0.7rem', color:'#059669', fontWeight:600 }}>Finalized {new Date(session.finalized_at).toLocaleDateString()}</span>}
        {!session.is_final && (
          <button onClick={e => { e.stopPropagation(); onFinalize(session); }}
            style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:8, border:'1px solid #A7F3D0', background:'#ECFDF5', color:'#059669', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
            ✓ Mark as Final
          </button>
        )}
      </div>
    </div>
  );
}

const th = { padding:'10px 14px', background:'var(--ink)', color:'rgba(255,255,255,0.65)', fontWeight:600, textAlign:'left', fontSize:'0.66rem', textTransform:'uppercase', letterSpacing:'0.8px', whiteSpace:'nowrap' };

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminResults() {
  const [elections, setElections] = useState([]);
  const [electionId, setElectionId] = useState('');
  const [tab, setTab] = useState('choices'); // 'choices' | 'sessions'

  // Choice results state
  const [choices, setChoices] = useState(null);
  const [choicesLoading, setChoicesLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionSteps, setSessionSteps]   = useState([]);
  const [stepsExpanded, setStepsExpanded] = useState(null);

  // New session form
  const [showNewSession, setShowNewSession] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Student detail drill-down
  const [studentFilter, setStudentFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  const [msg, setMsg] = useState(null);

  // Load elections
  useEffect(() => {
    api.get('/elections').then(r => {
      const list = r.data.data || [];
      setElections(list);
      const stopped = list.find(e => e.status === 'STOPPED');
      if (stopped) setElectionId(String(stopped.election_id));
    });
  }, []);

  // Load choices when election changes
  const loadChoices = useCallback(() => {
    if (!electionId) return;
    setChoicesLoading(true);
    api.get(`/results/${electionId}/choices`)
      .then(r => setChoices(r.data))
      .catch(() => setMsg({ type:'error', text:'Failed to load choice results.' }))
      .finally(() => setChoicesLoading(false));
  }, [electionId]);

  const loadSessions = useCallback(() => {
    if (!electionId) return;
    setSessionsLoading(true);
    api.get(`/results/${electionId}/sessions`)
      .then(r => setSessions(r.data.data || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [electionId]);

  useEffect(() => {
    if (electionId) { loadChoices(); loadSessions(); }
  }, [electionId, loadChoices, loadSessions]);

  // Load session detail
  const loadDetail = useCallback((session) => {
    setSelectedSession(session);
    setDetailLoading(true);
    api.get(`/results/sessions/${session.session_id}`)
      .then(r => setSessionDetail(r.data))
      .catch(() => setMsg({ type:'error', text:'Failed to load session.' }))
      .finally(() => setDetailLoading(false));
    // Also load step history for this election
    api.get(`/allocation/${session.election_id}/steps`)
      .then(r => setSessionSteps(r.data.data || []))
      .catch(() => {});
  }, []);

  const handleCreateSession = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post(`/results/${electionId}/sessions`, { session_name: newName.trim(), notes: newNotes.trim() || null });
      setShowNewSession(false); setNewName(''); setNewNotes('');
      loadSessions();
      setMsg({ type:'success', text:'Session created. Click it to open.' });
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.message || 'Create failed.' });
    } finally { setCreating(false); }
  };

  const handleFinalize = async (session) => {
    if (!window.confirm(`Mark "${session.session_name}" as the final allocation? Any previously final session will be un-finaled.`)) return;
    try {
      await api.post(`/results/sessions/${session.session_id}/finalize`);
      loadSessions();
      if (selectedSession?.session_id === session.session_id) loadDetail(session);
      setMsg({ type:'success', text:'Session marked as final.' });
    } catch { setMsg({ type:'error', text:'Failed to finalize.' }); }
  };

  const handleRestore = async (session) => {
    if (!window.confirm(`RESTORE WARNING: This will overwrite the current live allocation state in the Allocation Panel with the snapshot from "${session.session_name}". Proceed?`)) return;
    try {
      await api.post(`/results/sessions/${session.session_id}/restore`);
      setMsg({ type:'success', text:'Snapshot restored to live state. You can now see it in the Allocation Panel.' });
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.message || 'Restore failed.' });
    }
  };

  const handleExport = (session, bySection = false) => {
    const token = localStorage.getItem('ucos_token');
    const base = '/api';
    const url = `${base}/results/sessions/${session.session_id}/export${bySection ? '?by_section=1' : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `allocation_${session.session_name.replace(/\s+/g,'_')}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }).catch(() => setMsg({ type:'error', text:'Export failed.' }));
  };

  // Filter session detail rows
  const filteredRows = sessionDetail?.rows?.filter(r => {
    const q = studentFilter.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.register_number.includes(q);
    const matchSection = sectionFilter === 'ALL' || r.section === sectionFilter;
    return matchSearch && matchSection;
  }) || [];

  const sections = [...new Set((sessionDetail?.rows || []).map(r => r.section))].sort();

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.7rem', fontWeight:800, letterSpacing:'-0.6px', color:'var(--text)', marginBottom:4 }}>Results</h1>
            <p style={{ fontSize:'0.84rem', color:'var(--text-3)' }}>
              Choice results are locked at election stop &nbsp;·&nbsp; Allocation sessions are named and saved separately
            </p>
          </div>
          <select value={electionId} onChange={e => { setElectionId(e.target.value); setSelectedSession(null); setSessionDetail(null); }}
            style={{ padding:'8px 12px', borderRadius:10, border:'1.5px solid var(--border)', fontSize:'0.85rem', fontFamily:'var(--font)', background:'var(--surface)', minWidth:220, outline:'none' }}>
            <option value="">— Select Election —</option>
            {elections.map(e => <option key={e.election_id} value={e.election_id}>{e.election_name} ({e.status})</option>)}
          </select>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom:20, display:'flex', justifyContent:'space-between' }}>
            {msg.text}
            <button onClick={() => setMsg(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1rem' }}>×</button>
          </div>
        )}

        {!electionId ? (
          <EmptyState icon="📊" title="Select an election" message="Choose a stopped election to view its results." />
        ) : (
          <>
            {/* Two-store explanation banner */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              {[
                {
                  icon:'🔒', title:'Choice Results', sub:'Immutable snapshot',
                  desc:'Locked automatically when the election stops. Captures exactly what every student chose — never modified.',
                  color:'#4F46E5', bg:'#EEF2FF', border:'#C7D2FE',
                  active: tab === 'choices',
                  onClick: () => setTab('choices'),
                },
                {
                  icon:'📋', title:'Allocation Sessions', sub:'Named, versioned work',
                  desc:'Admin creates named sessions based on choice results. Can make any number. Mark one as Final to publish.',
                  color:'#059669', bg:'#ECFDF5', border:'#A7F3D0',
                  active: tab === 'sessions',
                  onClick: () => setTab('sessions'),
                },
              ].map(card => (
                <div key={card.title} onClick={card.onClick} style={{
                  background: card.active ? card.bg : 'var(--surface)',
                  border: `1.5px solid ${card.active ? card.border : 'var(--border)'}`,
                  borderRadius:16, padding:'18px 22px', cursor:'pointer',
                  boxShadow: card.active ? `0 0 0 3px ${card.color}20` : 'var(--shadow-sm)',
                  transition:'all 0.2s',
                }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:'1.6rem' }}>{card.icon}</span>
                    <div>
                      <div style={{ fontWeight:800, fontSize:'0.95rem', color: card.active ? card.color : 'var(--text)', marginBottom:2 }}>
                        {card.title}
                        <span style={{ marginLeft:8, fontSize:'0.68rem', fontWeight:600, opacity:0.7 }}>{card.sub}</span>
                      </div>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-3)', lineHeight:1.6, margin:0 }}>{card.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── CHOICE RESULTS TAB ── */}
            {tab === 'choices' && (
              <>
                {choicesLoading ? (
                  <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
                ) : !choices?.locked ? (
                  <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', padding:'48px 24px', textAlign:'center' }}>
                    <div style={{ fontSize:'3rem', marginBottom:14 }}>⏳</div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:800, marginBottom:8 }}>Choice results not yet locked</h3>
                    <p style={{ color:'var(--text-3)', lineHeight:1.7, maxWidth:380, margin:'0 auto' }}>
                      Results are locked automatically when the election is stopped. Once locked they can never be changed — they are the permanent record of student choices.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Lock info */}
                    <div style={{ background:'linear-gradient(135deg, #0A0F1E, #1a1f35)', borderRadius:16, padding:'18px 24px', marginBottom:20, display:'flex', alignItems:'center', gap:16, border:'1px solid rgba(79,70,229,0.25)' }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:'rgba(79,70,229,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>🔒</div>
                      <div>
                        <div style={{ fontWeight:700, color:'white', marginBottom:3 }}>Choice Results Locked</div>
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
                          {choices.total_students} students &nbsp;·&nbsp; {choices.total_records} choice records &nbsp;·&nbsp;
                          Locked {choices.locked_at ? new Date(choices.locked_at).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div style={{ marginLeft:'auto', fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>
                        This record is immutable — it never changes
                      </div>
                    </div>

                    {/* Summary table */}
                    <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', marginBottom:20, boxShadow:'var(--shadow-sm)' }}>
                      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text)' }}>Demand Summary — by Course</div>
                        <div style={{ fontSize:'0.74rem', color:'var(--text-4)' }}>T1 = highest preference · T5 = lowest</div>
                      </div>
                      <ChoiceResultsTable summary={choices.summary || []} />
                    </div>

                    {/* Per-student detail */}
                    <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
                      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text)' }}>Student Records</span>
                        <input placeholder="Search name or reg no…" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}
                          style={{ marginLeft:'auto', width:200, padding:'6px 11px', borderRadius:9, border:'1.5px solid var(--border)', fontSize:'0.8rem', fontFamily:'var(--font)', outline:'none' }}
                          onFocus={e => e.target.style.borderColor='var(--accent)'}
                          onBlur={e => e.target.style.borderColor='var(--border)'} />
                      </div>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                          <thead>
                            <tr>
                              {['Name','Reg No','Sec','Token','Course','Method','Status'].map(h => (
                                <th key={h} style={th}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(choices.rows || [])
                              .filter(r => !studentFilter || r.name.toLowerCase().includes(studentFilter.toLowerCase()) || r.register_number.includes(studentFilter))
                              .slice(0, 200)
                              .map((r, i) => (
                                <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'var(--surface)':'var(--muted-bg)' }}>
                                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{r.name}</td>
                                  <td style={{ padding:'9px 14px' }}><span className="code-chip" style={{fontSize:'0.7rem'}}>{r.register_number}</span></td>
                                  <td style={{ padding:'9px 14px' }}><span className="badge badge-blue">Sec {r.section}</span></td>
                                  <td style={{ padding:'9px 14px', textAlign:'center' }}><TierPill n={r.token_number} /></td>
                                  <td style={{ padding:'9px 14px', color:'var(--text-2)' }}>{r.course_name}</td>
                                  <td style={{ padding:'9px 14px' }}><MethodTag auto={r.is_auto_assigned} /></td>
                                  <td style={{ padding:'9px 14px' }}>
                                    <span style={{ fontSize:'0.68rem', padding:'2px 8px', borderRadius:99, background: r.original_status==='CONFIRMED'?'#ECFDF5': r.original_status==='AUTO'?'#F5F3FF':'var(--muted-bg)', color: r.original_status==='CONFIRMED'?'#059669': r.original_status==='AUTO'?'#7C3AED':'var(--text-4)', fontWeight:700 }}>
                                      {r.original_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {(choices.rows||[]).length > 200 && (
                          <div style={{ padding:'12px 16px', fontSize:'0.78rem', color:'var(--text-4)', textAlign:'center' }}>Showing first 200 of {choices.rows.length} records. Use search to narrow.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── SESSIONS TAB ── */}
            {tab === 'sessions' && (
              <div style={{ display:'grid', gridTemplateColumns: selectedSession ? '320px 1fr' : '1fr', gap:20, alignItems:'start' }}>

                {/* Sessions sidebar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--text)' }}>Allocation Sessions</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowNewSession(true)}>+ New</button>
                  </div>

                  {sessionsLoading ? (
                    <div style={{ textAlign:'center', padding:40 }}><Spinner dark /></div>
                  ) : sessions.length === 0 ? (
                    <div style={{ background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)', padding:'36px 20px', textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', marginBottom:10 }}>📋</div>
                      <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:6 }}>No sessions yet</div>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-3)', lineHeight:1.6, marginBottom:16 }}>
                        Create a named session to start working on an allocation. Sessions are based on the locked choice results and can be saved, compared, and finalized.
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowNewSession(true)}>Create First Session</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {sessions.map(s => (
                        <SessionCard key={s.session_id} session={s}
                          selected={selectedSession?.session_id === s.session_id}
                          onSelect={loadDetail}
                          onFinalize={handleFinalize} />
                      ))}
                    </div>
                  )}

                  {/* The step is mandatory / user action is not */}
                  <div style={{ marginTop:16, padding:'12px 14px', background:'var(--muted-bg)', borderRadius:12, fontSize:'0.76rem', color:'var(--text-3)', lineHeight:1.7 }}>
                    <strong style={{ color:'var(--text-2)' }}>ℹ How it works</strong><br/>
                    Locking choice results is <strong>mandatory</strong> and automatic. Creating allocation sessions and marking one as final is the admin's <strong>optional</strong> manual step — but the choice results exist regardless.
                  </div>
                </div>

                {/* Session detail */}
                {selectedSession && (
                  <div>
                    {detailLoading ? (
                      <div style={{ textAlign:'center', padding:60 }}><Spinner dark /></div>
                    ) : sessionDetail && (
                      <>
                        {/* Session header */}
                        <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', padding:'20px 24px', marginBottom:20, boxShadow:'var(--shadow-sm)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                            <div>
                              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1.15rem', color:'var(--text)', marginBottom:4 }}>
                                {sessionDetail.session.session_name}
                                {sessionDetail.session.is_final && (
                                  <span style={{ marginLeft:10, fontSize:'0.65rem', background:'#059669', color:'white', padding:'2px 8px', borderRadius:99, fontWeight:700, verticalAlign:'middle' }}>FINAL</span>
                                )}
                              </div>
                              {sessionDetail.session.notes && (
                                <div style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>{sessionDetail.session.notes}</div>
                              )}
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                              <button onClick={() => handleExport(selectedSession)} className="btn btn-surface btn-sm">⬇ CSV</button>
                              <button onClick={() => handleExport(selectedSession, true)} className="btn btn-surface btn-sm">⬇ by Section</button>
                              <button onClick={() => handleRestore(selectedSession)} className="btn btn-warning btn-sm" title="Restore this snapshot to the live Allocation Panel">↺ Restore to Live</button>
                              {!sessionDetail.session.is_final && (
                                <button onClick={() => handleFinalize(selectedSession)} className="btn btn-success btn-sm">✓ Mark Final</button>
                              )}
                            </div>
                          </div>

                          {/* Session stats */}
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                            {[
                              { label:'Students', v: [...new Set((sessionDetail.rows||[]).map(r=>r.student_id))].length, color:'#4F46E5' },
                              { label:'Overrides', v: sessionDetail.overrides, color:'#D97706' },
                              { label:'Self', v: (sessionDetail.rows||[]).filter(r=>!r.is_auto_assigned&&!r.is_overridden).length, color:'#059669' },
                              { label:'Auto', v: (sessionDetail.rows||[]).filter(r=>r.is_auto_assigned).length, color:'#7C3AED' },
                            ].map(s => (
                              <div key={s.label} style={{ background:'var(--muted-bg)', borderRadius:10, padding:'10px 14px', borderLeft:`3px solid ${s.color}` }}>
                                <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>{s.label}</div>
                                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:800, color:s.color, letterSpacing:'-1px', lineHeight:1 }}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Summary table */}
                        <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', marginBottom:20, boxShadow:'var(--shadow-sm)' }}>
                          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
                            <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--text)' }}>Course Distribution (with overrides applied)</span>
                          </div>
                          <ChoiceResultsTable summary={sessionDetail.summary || []} />
                        </div>

                        {/* Student records table */}
                        <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
                          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--text)' }}>Student Allocation Records</span>
                            <div style={{ display:'flex', background:'var(--muted-bg)', borderRadius:8, padding:2, gap:1 }}>
                              {['ALL', ...sections].map(s => (
                                <button key={s} onClick={() => setSectionFilter(s)}
                                  style={{ padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:'0.72rem', fontWeight:600, background: sectionFilter===s?'var(--surface)':'transparent', color: sectionFilter===s?'var(--text)':'var(--text-4)', transition:'all 0.15s' }}>
                                  {s === 'ALL' ? 'All' : `Sec ${s}`}
                                </button>
                              ))}
                            </div>
                            <input placeholder="Search…" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}
                              style={{ marginLeft:'auto', width:180, padding:'6px 11px', borderRadius:9, border:'1.5px solid var(--border)', fontSize:'0.78rem', fontFamily:'var(--font)', outline:'none' }}
                              onFocus={e => e.target.style.borderColor='var(--accent)'}
                              onBlur={e => e.target.style.borderColor='var(--border)'} />
                          </div>
                          <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                              <thead>
                                <tr>
                                  {['Name','Reg No','Sec','Token','Course','Method'].map(h => <th key={h} style={th}>{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRows.slice(0, 300).map((r, i) => (
                                  <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: r.is_overridden?'#FFF7ED': i%2===0?'var(--surface)':'var(--muted-bg)' }}>
                                    <td style={{ padding:'9px 14px', fontWeight:600 }}>{r.name}</td>
                                    <td style={{ padding:'9px 14px' }}><span className="code-chip" style={{fontSize:'0.7rem'}}>{r.register_number}</span></td>
                                    <td style={{ padding:'9px 14px' }}><span className="badge badge-blue">Sec {r.section}</span></td>
                                    <td style={{ padding:'9px 14px', textAlign:'center' }}><TierPill n={r.token_number} /></td>
                                    <td style={{ padding:'9px 14px' }}>
                                      <div>
                                        <span style={{ color: r.is_overridden?'#C2410C':'var(--text-2)', fontWeight: r.is_overridden?700:400 }}>{r.course_name}</span>
                                        {r.is_overridden && r.original_course_name && (
                                          <div style={{ fontSize:'0.68rem', color:'var(--text-4)', textDecoration:'line-through' }}>{r.original_course_name}</div>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ padding:'9px 14px' }}><MethodTag auto={r.is_auto_assigned} overridden={r.is_overridden} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Step History in this session's election */}
                        {sessionSteps.length > 0 && (
                          <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)', marginTop:20 }}>
                            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background:'var(--muted-bg)' }}
                              onClick={() => setStepsExpanded(v => v === 'open' ? null : 'open')}>
                              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                <span style={{ fontSize:'1rem' }}>📋</span>
                                <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--text)' }}>Alter Table — Step History</span>
                                <span style={{ fontSize:'0.68rem', background:'var(--muted-bg)', border:'1px solid var(--border)', borderRadius:99, padding:'2px 10px', fontWeight:700, color:'var(--text-3)' }}>{sessionSteps.length} steps</span>
                              </div>
                              <span style={{ color:'var(--text-4)', fontSize:'0.8rem', transition:'transform 0.2s', display:'inline-block', transform: stepsExpanded==='open'?'rotate(180deg)':'none' }}>▾</span>
                            </div>
                            {stepsExpanded === 'open' && (
                              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                                <div style={{ fontSize:'0.76rem', color:'var(--text-4)', marginBottom:4, lineHeight:1.6 }}>
                                  Every Confirm and Burst action during allocation is recorded as a numbered step with a full distribution snapshot — shown here for traceability in reports.
                                </div>
                                {sessionSteps.map(step => {
                                  const isBurst = step.action_type === 'BURST';
                                  const color   = isBurst ? '#DC2626' : '#059669';
                                  const bg      = isBurst ? '#FEF2F2' : '#ECFDF5';
                                  const border  = isBurst ? '#FECACA' : '#A7F3D0';
                                  const isOpen  = stepsExpanded === step.step_id;
                                  return (
                                    <div key={step.step_id} style={{ borderRadius:12, border:`1.5px solid ${isOpen?color:border}`, overflow:'hidden', background:'var(--surface)' }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', cursor:'pointer', background:isOpen?bg:'var(--surface)' }}
                                        onClick={() => setStepsExpanded(isOpen ? 'open' : step.step_id)}>
                                        <div style={{ width:28, height:28, borderRadius:8, background:color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.75rem', flexShrink:0 }}>{step.step_number}</div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                                            <span style={{ fontWeight:800, fontSize:'0.78rem', color, textTransform:'uppercase' }}>{isBurst?'✕ Burst':'✓ Confirm'}</span>
                                            <span style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text)' }}>{step.course_name}</span>
                                            {isBurst
                                              ? <span style={{ fontSize:'0.64rem', background:bg, color, border:`1px solid ${border}`, borderRadius:99, padding:'1px 8px', fontWeight:700 }}>{step.cascade_count} cascaded</span>
                                              : <span style={{ fontSize:'0.64rem', background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', borderRadius:99, padding:'1px 8px', fontWeight:700 }}>{step.confirm_count} confirmed</span>
                                            }
                                          </div>
                                          {step.reason && <div style={{ fontSize:'0.7rem', color:'var(--text-4)', fontStyle:'italic', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>"{step.reason}"</div>}
                                        </div>
                                        <div style={{ fontSize:'0.64rem', color:'var(--text-4)', fontFamily:'var(--mono)', flexShrink:0 }}>{new Date(step.created_at).toLocaleTimeString()}</div>
                                        <span style={{ color:'var(--text-4)', fontSize:'0.72rem', transition:'transform 0.15s', display:'inline-block', transform:isOpen?'rotate(180deg)':'none' }}>▾</span>
                                      </div>
                                      {isOpen && step.snapshot && step.snapshot.length > 0 && (
                                        <div style={{ borderTop:`1px solid ${border}`, background: isBurst?'#fff8f8':'#f8fffe', overflowX:'auto' }}>
                                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.74rem' }}>
                                            <thead>
                                              <tr>
                                                {['Course','T1','T2','T3','T4','T5','Alloc','Elim'].map(h=>(
                                                  <th key={h} style={{ padding:'6px 10px', background:color+'22', color, fontWeight:700, textAlign:h==='Course'?'left':'center', fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {step.snapshot.map((row,i)=>(
                                                <tr key={i} style={{ borderBottom:`1px solid ${border}55`, background: row.is_burst?'#fef2f2':i%2===0?'white':color+'06' }}>
                                                  <td style={{ padding:'6px 10px', fontWeight:700, color:row.is_burst?'#DC2626':'var(--text)', whiteSpace:'nowrap', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis' }}>{row.course_name}</td>
                                                  {[1,2,3,4,5].map(n=>(
                                                    <td key={n} style={{ padding:'6px 10px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:Number(row[`t${n}`]||0)>0?700:400, color:Number(row[`t${n}`]||0)>0?['','#4F46E5','#7C3AED','#D97706','#059669','#DC2626'][n]:'var(--text-4)' }}>
                                                      {Number(row[`t${n}`]||0)||'·'}
                                                    </td>
                                                  ))}
                                                  <td style={{ padding:'6px 10px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, color:'#059669' }}>{row.allocated||0}</td>
                                                  <td style={{ padding:'6px 10px', textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, color:'#DC2626' }}>{row.burst_total||0}</td>
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
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* New session modal */}
        {showNewSession && (
          <Modal title="Create Allocation Session" onClose={() => setShowNewSession(false)}
            footer={<>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewSession(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSession} disabled={creating || !newName.trim()}>
                {creating ? <Spinner /> : 'Create Session'}
              </button>
            </>}>
            <div style={{ marginBottom:16, padding:'12px 14px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, fontSize:'0.8rem', color:'#1E40AF', lineHeight:1.6 }}>
              Sessions are based on the locked choice results. You can create any number of sessions and compare them. Mark one as Final when ready to publish.
            </div>
            <div className="form-group">
              <label className="form-label">Session Name *</label>
              <input className="form-input" placeholder="e.g. Draft 1, Section A Priority, Final Allocation" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-input" placeholder="What makes this session different…" value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={3} style={{ resize:'vertical' }} />
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

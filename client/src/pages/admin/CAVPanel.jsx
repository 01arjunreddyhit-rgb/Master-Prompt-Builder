import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../../context/ElectionContext';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, Badge, Card, Button, Alert } from '../../components/ui/index';
import api from '../../services/api';

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${copied ? '#A7F3D0' : 'var(--border)'}`, background: copied ? '#ECFDF5' : 'var(--surface)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, fontFamily: 'var(--font)', color: copied ? '#059669' : 'var(--text-3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}

/* ── Participant Detail Popup (Instruction 5/6) ────────────────── */
function ParticipantDetailModal({ p, onClose, onAction, acting, onSaveDetails }) {
  const statusColor = { PENDING: '#D97706', CONFIRMED: '#059669', REJECTED: '#DC2626' };

  // Parse institutional metadata
  const metadata = (() => {
    if (!p.metadata_json) return null;
    try { return typeof p.metadata_json === 'string' ? JSON.parse(p.metadata_json) : p.metadata_json; } catch { return null; }
  })();

  const [editMeta, setEditMeta] = useState(metadata ? { ...metadata } : null);
  const [editName, setEditName] = useState(p.display_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveDetails(p.participant_id, { metadata_json: editMeta, display_name: editName });
    setSaving(false);
  };

  return (
    <Modal title="Participant Details" onClose={onClose} maxWidth={520}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 18px', background: `${statusColor[p.status]}11`, borderRadius: 14, border: `1.5px solid ${statusColor[p.status]}33` }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${statusColor[p.status]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: statusColor[p.status] }}>
          {(p.display_name || p.name || '?')[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <input value={editName} onChange={e => setEditName(e.target.value)}
            style={{ fontWeight: 700, fontSize: '1rem', border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)', width: '100%', outline: 'none', borderBottom: '1px dashed var(--border)', paddingBottom: 2 }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 3 }}>{p.email}</div>
        </div>
        <div>
          {/* Invited / Uninvited badge */}
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800,
            background: p.is_invited ? 'rgba(79,70,229,0.12)' : 'rgba(220,38,38,0.1)',
            color: p.is_invited ? '#4F46E5' : '#DC2626', border: `1px solid ${p.is_invited ? 'rgba(79,70,229,0.25)' : 'rgba(220,38,38,0.2)'}`,
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            {p.is_invited !== false ? '✓ Invited' : '⚠ Uninvited'}
          </span>
        </div>
      </div>

      {/* Q2: Primary Identity Verification (3-column comparison) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
          Primary Identity Verification (Access Gate)
        </div>
        <div style={{ background: 'var(--muted-bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-4)' }}>Field</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-4)' }}>Admin Given</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-4)' }}>Platform Value</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Platform ID', admin: p.platform_id_given, platform: p.full_student_id },
                { label: 'Platform Username', admin: p.username_given, platform: p.register_number },
              ].map(f => {
                const isMatch = !f.admin || f.admin === f.platform;
                return (
                  <tr key={f.label} style={{ borderBottom: '1px solid var(--border)', background: isMatch ? '#ECFDF533' : '#FEF2F2' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{f.label}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: isMatch ? '#059669' : '#DC2626' }}>{f.admin || '(Not provided)'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {f.platform}
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isMatch ? '#10B981' : '#F472B6' }} title={isMatch ? 'Match' : 'Mismatch (Indicator Only)'} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 6, fontStyle: 'italic' }}>
          Pink indicator means admin data doesn't match platform data. Student was still allowed to proceed.
        </div>
      </div>

      {/* Base fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          ['Register No.', p.register_number],
          ['Section', p.section ? `Section ${p.section}` : '—'],
          ['Applied', p.applied_at ? new Date(p.applied_at).toLocaleString() : '—'],
          ['Status', p.status],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ background: 'var(--muted-bg)', padding: '8px 12px', borderRadius: 10 }}>
            <div style={{ fontSize: '0.63rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{lbl}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{val || '—'}</div>
          </div>
        ))}
      </div>

      {/* Institutional metadata (dynamic fields from institution CSV) */}
      {editMeta && Object.keys(editMeta).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Institution Data {p.is_invited !== false ? '(Pre-filled from invite list)' : '(Submitted by student)'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(editMeta).filter(([k]) => k !== 'email').map(([key, val]) => {
              const isDropdownField = ['section', 'semester', 'year', 'batch', 'department', 'stream'].some(f => key.toLowerCase().includes(f));
              return (
                <div key={key}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{key.replace(/_/g, ' ')}</div>
                  <input value={val || ''} onChange={e => setEditMeta(m => ({ ...m, [key]: e.target.value }))}
                    className="form-input" style={{ fontSize: '0.82rem', padding: '5px 10px' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No metadata for uninvited who hasn't submitted */}
      {!metadata && p.is_invited === false && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: '0.78rem', color: '#92400E' }}>
          ⚠ This student was not on the invite list and has not submitted the registration form yet.
        </div>
      )}

      {/* Action buttons */}
      {p.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? <Spinner /> : 'Save Details'}
          </button>
          <button className="btn btn-success" onClick={() => onAction(p.participant_id, 'confirm')} disabled={acting === p.participant_id} style={{ flex: 1 }}>
            {acting === p.participant_id ? <Spinner /> : '✓ Confirm'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onAction(p.participant_id, 'reject')} disabled={acting === p.participant_id} style={{ flex: 1 }}>
            ✕ Reject
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ── Participant Row ─────────────────────────────────────────────── */
function ParticipantRow({ p, onAction, acting, selected, onSelect, onViewDetail }) {
  const statusColor = { PENDING: '#D97706', CONFIRMED: '#059669', REJECTED: '#DC2626' };
  const statusBg    = { PENDING: '#FFFBEB', CONFIRMED: '#ECFDF5', REJECTED: '#FEF2F2' };
  const isInvited   = p.is_invited !== false;

  return (
    <tr style={{ cursor: 'pointer', background: selected ? 'rgba(79,70,229,0.04)' : 'transparent' }}>
      <td onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(p.participant_id)}
          style={{ cursor: 'pointer', width: 15, height: 15 }} />
      </td>
      <td onClick={() => onViewDetail(p)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${statusColor[p.status]}22`, border: `2px solid ${statusColor[p.status]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', color: statusColor[p.status], flexShrink: 0 }}>
            {(p.display_name || '?')[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{p.display_name}</div>
            {!isInvited && (
              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(220,38,38,0.1)', color: '#DC2626', fontWeight: 700, border: '1px solid rgba(220,38,38,0.15)' }}>UNINVITED</span>
            )}
          </div>
        </div>
      </td>
      <td onClick={() => onViewDetail(p)}><span className="code-chip" style={{ fontSize: '0.74rem' }}>{p.register_number || '—'}</span></td>
      <td onClick={() => onViewDetail(p)} style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{p.email}</td>
      <td onClick={() => onViewDetail(p)}><Badge variant="blue">Sec {p.section || '—'}</Badge></td>
      <td onClick={() => onViewDetail(p)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: statusBg[p.status], color: statusColor[p.status], fontSize: '0.72rem', fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[p.status] }} />{p.status}
        </span>
      </td>
      <td onClick={e => e.stopPropagation()}>
        {p.status === 'PENDING' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-success btn-sm" disabled={acting === p.participant_id} onClick={() => onAction(p.participant_id, 'confirm')}>✓</button>
            <button className="btn btn-danger btn-sm" disabled={acting === p.participant_id} onClick={() => onAction(p.participant_id, 'reject')}>✕</button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ── Main CAVPanel ───────────────────────────────────────────────── */
export default function CAVPanel() {
  const navigate = useNavigate();
  const { selectedElection } = useElection();
  const [cav, setCav]                   = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [acting, setActing]             = useState(null);
  const [msg, setMsg]                   = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds]   = useState([]);
  const [bulkLoading, setBulkLoading]   = useState(false);
  const [detailParticipant, setDetailParticipant] = useState(null);

  const load = useCallback(() => {
    if (!selectedElection) { navigate('/admin'); return; }
    setLoading(true);
    Promise.all([
      api.get(`/cav/${selectedElection.election_id}`),
      api.get(`/cav/${selectedElection.election_id}/participants`),
    ]).then(([cR, pR]) => {
      setCav(cR.data.cav);
      // Sort: invited first, then uninvited at bottom (Instruction 6)
      const all = (pR.data.data || []).sort((a, b) => {
        if (a.is_invited === b.is_invited) return new Date(a.applied_at) - new Date(b.applied_at);
        return (b.is_invited ? 1 : 0) - (a.is_invited ? 1 : 0);
      });
      setParticipants(all);
    }).catch(() => setMsg({ type: 'error', text: 'Load failed.' }))
      .finally(() => setLoading(false));
  }, [selectedElection, navigate]);

  useEffect(() => { load(); }, [load]);

  const regenerate = async () => {
    if (!window.confirm('Regenerate? The old link will stop working immediately.')) return;
    try { await api.post(`/cav/${selectedElection.election_id}/regenerate`); load(); setMsg({ type: 'success', text: 'CAV regenerated.' }); }
    catch { setMsg({ type: 'error', text: 'Failed to regenerate.' }); }
  };

  const handleAction = async (pid, action) => {
    setActing(pid);
    try {
      await api.post(`/cav/participants/${pid}/review`, { action });
      setMsg({ type: 'success', text: `Participant ${action === 'confirm' ? 'confirmed ✓' : 'rejected'}.` });
      if (detailParticipant?.participant_id === pid) setDetailParticipant(null);
      load();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' }); }
    finally { setActing(null); }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;
    if (!window.confirm(`${action === 'confirm' ? 'Confirm' : 'Reject'} ${selectedIds.length} participant(s)?`)) return;
    setBulkLoading(true);
    try {
      await api.post('/cav/participants/bulk-review', { participant_ids: selectedIds, action });
      setMsg({ type: 'success', text: `${selectedIds.length} participant(s) ${action === 'confirm' ? 'confirmed' : 'rejected'}.` });
      setSelectedIds([]);
      load();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Bulk action failed.' }); }
    finally { setBulkLoading(false); }
  };

  const handleSaveDetails = async (pid, payload) => {
    try {
      await api.put(`/cav/participants/${pid}/details`, payload);
      setMsg({ type: 'success', text: 'Details updated.' });
      load();
    } catch (err) { setMsg({ type: 'error', text: 'Save failed.' }); }
  };

  const toggleSelect = (pid) => setSelectedIds(ids => ids.includes(pid) ? ids.filter(id => id !== pid) : [...ids, pid]);
  const pendingIds = participants.filter(p => p.status === 'PENDING').map(p => p.participant_id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every(id => selectedIds.includes(id));
  const toggleSelectAllPending = () => setSelectedIds(allPendingSelected ? [] : pendingIds);

  const filtered = participants.filter(p => filterStatus === 'ALL' || p.status === filterStatus);
  const counts = {
    ALL: participants.length,
    PENDING: participants.filter(p => p.status === 'PENDING').length,
    CONFIRMED: participants.filter(p => p.status === 'CONFIRMED').length,
    REJECTED: participants.filter(p => p.status === 'REJECTED').length,
    UNINVITED: participants.filter(p => p.is_invited === false).length,
  };

  if (!selectedElection && !loading) return null;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Access Control</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Workspace: {selectedElection?.election_name}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>← Switch Election</button>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : (
          <>
            {/* CAV Card */}
            {cav && (
              <div style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1C2537 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 5 }}>Join Code (CAV)</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '1.8rem', fontWeight: 800, color: '#818CF8', letterSpacing: '0.12em' }}>{cav.election_code}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: cav.is_active ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.15)', color: cav.is_active ? '#34D399' : '#FCA5A5', fontSize: '0.72rem', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                        {cav.is_active ? 'Active' : 'Expired'}
                      </span>
                      <button className="btn btn-surface btn-sm" onClick={regenerate}>Regenerate</button>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', marginBottom: 10, wordBreak: 'break-all' }}>{cav.join_link}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <CopyBtn text={cav.join_link} label="Copy Link" />
                      <CopyBtn text={cav.election_code} label="Copy Code" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { lbl: 'Total', v: participants.length, c: '#4F46E5' },
                { lbl: 'Pending', v: participants.filter(p => p.status === 'PENDING').length, c: '#D97706' },
                { lbl: 'Confirmed', v: participants.filter(p => p.status === 'CONFIRMED').length, c: '#059669' },
                { lbl: 'Rejected', v: participants.filter(p => p.status === 'REJECTED').length, c: '#DC2626' },
                { lbl: 'Uninvited', v: participants.filter(p => p.is_invited === false).length, c: '#EC4899' },
              ].map(s => (
                <div key={s.lbl} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.lbl}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.c, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Bulk action bar */}
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-light)', border: '1px solid var(--accent-3)', borderRadius: 12, padding: '10px 18px', marginBottom: 16 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>{selectedIds.length} selected</span>
                <button className="btn btn-success btn-sm" onClick={() => handleBulkAction('confirm')} disabled={bulkLoading}>
                  {bulkLoading ? <Spinner /> : `✓ Confirm All (${selectedIds.length})`}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('reject')} disabled={bulkLoading}>
                  ✕ Reject All ({selectedIds.length})
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds([])}>Clear</button>
              </div>
            )}

            {/* Participants table */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Applicants</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAllPending}
                          title="Select all PENDING" style={{ cursor: 'pointer' }} />
                      </th>
                      <th>Participant</th>
                      <th>Reg No.</th>
                      <th>Email</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>No participants found.</td></tr>
                    ) : filtered.map(p => (
                      <ParticipantRow
                        key={p.participant_id} p={p}
                        onAction={handleAction} acting={acting}
                        selected={selectedIds.includes(p.participant_id)}
                        onSelect={toggleSelect}
                        onViewDetail={setDetailParticipant}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {counts.UNINVITED > 0 && (
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: '#7C3AED', background: 'rgba(124,58,237,0.04)' }}>
                  ⚠ {counts.UNINVITED} uninvited student(s) are shown at the bottom of the list. Review their submitted form data before confirming.
                </div>
              )}
            </Card>
          </>
        )}

        {/* Participant detail popup */}
        {detailParticipant && (
          <ParticipantDetailModal
            p={detailParticipant}
            onClose={() => setDetailParticipant(null)}
            onAction={(pid, action) => { handleAction(pid, action); setDetailParticipant(null); }}
            acting={acting}
            onSaveDetails={handleSaveDetails}
          />
        )}
      </main>
    </div>
  );
}

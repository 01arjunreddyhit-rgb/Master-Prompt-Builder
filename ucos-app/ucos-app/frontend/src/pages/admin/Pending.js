import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Badge, EmptyState, Spinner } from '../../components/ui/index';
import api from '../../services/api';

function PendingCard({ p, onAction, busy }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = { PENDING: '#D97706', APPROVED: '#059669', REJECTED: '#DC2626' };
  const statusBg    = { PENDING: '#FFFBEB', APPROVED: '#ECFDF5', REJECTED: '#FEF2F2' };
  const isPending   = p.status === 'PENDING';

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: `1.5px solid ${isPending ? '#FDE68A' : 'var(--border)'}`, overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: isPending ? '0 2px 12px rgba(217,119,6,0.1)' : 'var(--shadow-sm)' }}>
      {/* Top strip */}
      <div style={{ height: 3, background: statusColor[p.status] }} />

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: isPending ? '#FFFBEB' : 'var(--muted-bg)', border: `2px solid ${statusColor[p.status]}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: statusColor[p.status], flexShrink: 0 }}>
            {p.name?.[0]?.toUpperCase() || '?'}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{p.name}</span>
              <span style={{ padding: '2px 10px', borderRadius: 99, background: statusBg[p.status], color: statusColor[p.status], fontSize: '0.68rem', fontWeight: 700 }}>
                {p.status === 'PENDING' ? '⏳ Awaiting Review' : p.status === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
              </span>
              {p.is_email_verified
                ? <span style={{ fontSize: '0.64rem', background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Email ✓</span>
                : <span style={{ fontSize: '0.64rem', background: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Email ✗</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.76rem', color: 'var(--text-4)', flexWrap: 'wrap' }}>
              <span>{p.email}</span>
              <span>·</span>
              <span className="code-chip" style={{ fontSize: '0.68rem' }}>{p.register_number}</span>
              <span>·</span>
              <span>Section {p.section}</span>
              <span>·</span>
              <span>{new Date(p.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            {isPending && (
              <>
                <button className="btn btn-success btn-sm" onClick={() => onAction(p.pending_id, 'approve', p.name)} disabled={busy === p.pending_id} style={{ fontSize: '0.76rem', gap: 5 }}>
                  {busy === p.pending_id ? <Spinner /> : '✓'} Approve
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => onAction(p.pending_id, 'reject', p.name)} disabled={busy === p.pending_id} style={{ fontSize: '0.76rem' }}>
                  ✕ Reject
                </button>
              </>
            )}
            <button onClick={() => setExpanded(x => !x)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: '0.8rem', padding: '4px 8px', fontFamily: 'var(--font)' }}>
              {expanded ? '▴' : '▾'}
            </button>
          </div>
        </div>

        {/* Expanded credentials */}
        {expanded && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 14 }}>
            {[
              ['Full Name', p.name],
              ['Register Number', p.register_number],
              ['Email Address', p.email],
              ['Section', `Section ${p.section}`],
              ['Email Verified', p.is_email_verified ? 'Yes ✓' : 'No ✗'],
              ['Requested At', new Date(p.requested_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })],
              ['Status', p.status],
              ['Reviewed At', p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString() : '—'],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{lbl}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', wordBreak: 'break-all' }}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPending() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(null);
  const [msg, setMsg]         = useState(null);
  const [filter, setFilter]   = useState('PENDING');
  const [search, setSearch]   = useState('');

  const load = () => {
    setLoading(true);
    api.get('/admin/pending')
      .then(r => setPending(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onAction = async (id, action, name) => {
    setBusy(id);
    try {
      await api.post(`/admin/pending/${id}`, { action });
      setMsg({ type: 'success', text: `${name} ${action === 'approve' ? 'approved' : 'rejected'} successfully.` });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally { setBusy(null); }
  };

  const counts = {
    ALL:      pending.length,
    PENDING:  pending.filter(p => p.status === 'PENDING').length,
    APPROVED: pending.filter(p => p.status === 'APPROVED').length,
    REJECTED: pending.filter(p => p.status === 'REJECTED').length,
  };

  const filtered = pending.filter(p => {
    const matchFilter = filter === 'ALL' || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.register_number.includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Pending Approvals</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>
              {counts.PENDING > 0
                ? <span style={{ color: '#D97706', fontWeight: 600 }}>{counts.PENDING} student{counts.PENDING !== 1 ? 's' : ''} awaiting review</span>
                : 'All registrations reviewed'}
            </p>
          </div>
          <button className="btn btn-surface btn-sm" onClick={load}>↻ Refresh</button>
        </div>

        {msg && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20 }}>
            {msg.text}
            <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}>×</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Requests', v: counts.ALL,      color: '#4F46E5' },
            { label: 'Pending',        v: counts.PENDING,  color: '#D97706' },
            { label: 'Approved',       v: counts.APPROVED, color: '#059669' },
            { label: 'Rejected',       v: counts.REJECTED, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--muted-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
            {['ALL','PENDING','APPROVED','REJECTED'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.74rem', fontWeight: 700, background: filter === f ? 'var(--surface)' : 'transparent', color: filter === f ? 'var(--text)' : 'var(--text-4)', boxShadow: filter === f ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}>
                {f} ({counts[f]})
              </button>
            ))}
          </div>
          <input placeholder="Search name, email, reg no…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: 'auto', width: 220, padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '0.82rem', fontFamily: 'var(--font)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--border)'} />
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={filter === 'PENDING' ? '✅' : '🔍'}
            title={filter === 'PENDING' ? 'All clear!' : 'No results'}
            message={filter === 'PENDING' ? 'No pending registrations.' : `No ${filter.toLowerCase()} registrations found.`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(p => (
              <PendingCard key={p.pending_id} p={p} onAction={onAction} busy={busy} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

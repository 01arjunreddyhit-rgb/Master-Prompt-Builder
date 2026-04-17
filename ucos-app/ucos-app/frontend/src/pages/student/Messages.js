import React, { useState, useEffect, useCallback } from 'react';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Spinner, EmptyState } from '../../components/ui/index';
import api from '../../services/api';

const TYPE_STYLE = {
  CONFIRMATION: { bg: '#ECFDF5', border: '#A7F3D0', icon: '✅', color: '#065F46', label: 'Confirmed' },
  REJECTION:    { bg: '#FEF2F2', border: '#FECACA', icon: '❌', color: '#991B1B', label: 'Rejected' },
  INFO:         { bg: '#EFF6FF', border: '#BFDBFE', icon: 'ℹ️',  color: '#1E40AF', label: 'Info' },
  RESULT:       { bg: '#F5F3FF', border: '#DDD6FE', icon: '🏆', color: '#5B21B6', label: 'Result' },
};

function MessageCard({ msg, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const s = TYPE_STYLE[msg.message_type] || TYPE_STYLE.INFO;

  const handleExpand = () => {
    setExpanded(x => !x);
    if (!msg.is_read) onRead(msg.message_id);
  };

  return (
    <div onClick={handleExpand}
      style={{
        background: msg.is_read ? 'var(--surface)' : s.bg,
        border: `1.5px solid ${msg.is_read ? 'var(--border)' : s.border}`,
        borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
        transition: 'all 0.2s', marginBottom: 12,
        boxShadow: msg.is_read ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform='none'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {s.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontWeight: msg.is_read ? 600 : 800, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.35 }}>{msg.title}</div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              {!msg.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                {new Date(msg.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: s.border, color: s.color, fontWeight: 700 }}>{s.label}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-4)' }}>{msg.election_name}</span>
          </div>

          {expanded && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.7, borderLeft: `3px solid ${s.color}` }}>
              {msg.body}
            </div>
          )}

          {msg.expires_at && (
            <div style={{ marginTop: expanded ? 8 : 4, fontSize: '0.68rem', color: '#D97706' }}>
              ⏰ Expires {new Date(msg.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [unread, setUnread]     = useState(0);

  const load = useCallback(() => {
    api.get('/cav/messages')
      .then(r => {
        setMessages(r.data.data || []);
        setUnread(r.data.unread || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (message_id) => {
    try {
      await api.put(`/cav/messages/${message_id}/read`);
      setMessages(ms => ms.map(m => m.message_id === message_id ? { ...m, is_read: true } : m));
      setUnread(n => Math.max(0, n - 1));
    } catch {}
  };

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>
              Messages
              {unread > 0 && <span style={{ marginLeft: 12, background: '#4F46E5', color: 'white', fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, fontWeight: 700, verticalAlign: 'middle' }}>{unread} new</span>}
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Election notifications — expire after the election ends</p>
          </div>
          <button className="btn btn-surface btn-sm" onClick={load}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : messages.length === 0 ? (
          <EmptyState icon="💬" title="No messages yet" message="You'll receive messages here when you apply for elections or get confirmed." />
        ) : (
          <div>
            {unread > 0 && (
              <div style={{ marginBottom: 20, padding: '12px 18px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, fontSize: '0.82rem', color: '#1E40AF', fontWeight: 600 }}>
                📬 You have {unread} unread message{unread > 1 ? 's' : ''} — click to expand and mark as read
              </div>
            )}
            {messages.map(msg => (
              <MessageCard key={msg.message_id} msg={msg} onRead={markRead} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

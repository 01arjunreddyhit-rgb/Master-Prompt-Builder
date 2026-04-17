import React from 'react';

// ── SPINNER ───────────────────────────────────────────────────
export const Spinner = ({ dark }) => (
  <div className={`spinner ${dark ? 'dark' : ''}`} />
);

// ── BADGE ─────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'grey' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

// ── ELECTION STATUS PILL ──────────────────────────────────────
export const StatusPill = ({ status }) => {
  const map = {
    ACTIVE:      { label: 'Active', cls: 'pill-active' },
    PAUSED:      { label: 'Paused', cls: 'pill-paused' },
    STOPPED:     { label: 'Stopped', cls: 'pill-stopped' },
    NOT_STARTED: { label: 'Not Started', cls: 'pill-not_started' },
  };
  const s = map[status] || map['NOT_STARTED'];
  return (
    <span className={`election-status-pill ${s.cls}`}>
      <span className="status-dot" />
      {s.label}
    </span>
  );
};

// ── MODAL ─────────────────────────────────────────────────────
export const Modal = ({ title, children, footer, onClose, maxWidth = 520 }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div className="modal" style={{ maxWidth }}>
      <div className="modal-header">
        <span className="modal-title">{title}</span>
        {onClose && (
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
);

// ── ALERT ─────────────────────────────────────────────────────
export const Alert = ({ type = 'info', children }) => (
  <div className={`alert alert-${type}`}>{children}</div>
);

// ── PROGRESS BAR ──────────────────────────────────────────────
export const ProgressBar = ({ value, max, green }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${green ? 'green' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ── STAT CARD ─────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, color }) => (
  <div className={`stat-card ${color || ''}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

// ── EMPTY STATE ───────────────────────────────────────────────
export const EmptyState = ({ icon, title, message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon || '📭'}</div>
    <h3>{title || 'Nothing here yet'}</h3>
    <p>{message}</p>
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

// ── TOKEN CHIP ─────────────────────────────────────────────────
export const TokenChip = ({ number, status, courseName }) => {
  const statusLabel = {
    UNUSED: 'unused', BOOKED: 'booked', CONFIRMED: 'done',
    BURST: 'burst', AUTO: 'auto',
  };
  const isNext = status === 'UNUSED';
  return (
    <div className={`token-chip ${isNext ? 'next' : (status || 'unused').toLowerCase()}`}
         title={courseName || `Token T${number}`}>
      <span className="t-num">T{number}</span>
      <span className="t-status">{statusLabel[status] || 'idle'}</span>
    </div>
  );
};

// ── CONFIRM DIALOG ────────────────────────────────────────────
export const ConfirmDialog = ({ title, message, onConfirm, onCancel, danger }) => (
  <Modal title={title} onClose={onCancel}
    footer={
      <>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          Confirm
        </button>
      </>
    }>
    <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{message}</p>
  </Modal>
);

// ── BUTTON ────────────────────────────────────────────────────
export const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button className={`btn btn-${variant} ${className}`} {...props}>
    {children}
  </button>
);

// ── INPUT ─────────────────────────────────────────────────────
export const Input = ({ label, icon, className = '', containerStyle = {}, ...props }) => (
  <div className="form-group" style={{ marginBottom: 16, ...containerStyle }}>
    {label && <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-3)' }}>{label}</label>}
    <div style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>{icon}</span>}
      <input 
        className={`form-input ${className}`} 
        style={{ 
          paddingLeft: icon ? 40 : 12,
          width: '100%',
          height: 44,
          borderRadius: 12,
          border: '1.5px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'all 0.2s ease'
        }} 
        {...props} 
      />
    </div>
  </div>
);

// ── CARD ──────────────────────────────────────────────────────
export const Card = ({ children, className = '', ...props }) => (
  <div className={`card ${className}`} style={{ background: 'var(--surface)', borderRadius: 16, border: '1.5px solid var(--border)', padding: 20 }} {...props}>
    {children}
  </div>
);

// ── LOADING SCREEN ────────────────────────────────────────────
export const LoadingScreen = ({ text }) => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: 16, background: '#F0F4F8',
  }}>
    <Spinner dark />
    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{text || 'Loading...'}</p>
  </div>
);


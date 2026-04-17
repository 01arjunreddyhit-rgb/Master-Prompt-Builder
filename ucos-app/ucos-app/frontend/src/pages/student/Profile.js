import React, { useState } from 'react';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Alert, Spinner } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function StudentProfile() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = k => e => setPwForm(f => ({ ...f, [k]: e.target.value }));

  const handleChangePw = async (e) => {
    e.preventDefault(); setPwMsg(null);
    if (pwForm.new_password !== pwForm.confirm) return setPwMsg({ type: 'error', text: 'Passwords do not match.' });
    if (pwForm.new_password.length < 6)          return setPwMsg({ type: 'error', text: 'Min 6 characters required.' });
    setSaving(true);
    try {
      const { data } = await api.put('/student/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      if (data.success) { setPwMsg({ type: 'success', text: 'Password changed.' }); setPwForm({ current_password: '', new_password: '', confirm: '' }); }
    } catch (err) { setPwMsg({ type: 'error', text: err.response?.data?.message || 'Change failed.' }); }
    finally { setSaving(false); }
  };

  const initial = (user?.name || 'S')[0].toUpperCase();

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your account information</p>
        </div>

        {/* Identity card */}
        <div style={{
          background: 'linear-gradient(135deg, #065F46, #047857)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: 'white',
          display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 66, height: 66, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, flexShrink: 0,
          }}>{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>{user?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 3 }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              ['Student ID', user?.full_student_id],
              ['Section', `Sec ${user?.section}`],
              ['Reg No.', user?.register_number],
            ].map(([label, val]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.9rem' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div className="card mb-4">
          <div className="card-header"><span className="card-title">Account Details</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
            {[
              ['Student ID',    user?.full_student_id],
              ['Register No.',  user?.register_number],
              ['Section',       `Section ${user?.section}`],
              ['Admin ID',      user?.admin_id],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--muted-bg)', borderRadius: 10, padding: '12px 16px' }}>
                <div className="stat-label" style={{ marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--mono)', fontSize: '0.87rem', color: 'var(--text)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Change password */}
        <div className="card" style={{ maxWidth: 440 }}>
          <div className="card-header"><span className="card-title">Change Password</span></div>
          {pwMsg && <Alert type={pwMsg.type}>{pwMsg.text}</Alert>}
          <form onSubmit={handleChangePw}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={pwForm.current_password} onChange={set('current_password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters"
                value={pwForm.new_password} onChange={set('new_password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" placeholder="Repeat"
                value={pwForm.confirm} onChange={set('confirm')} required />
            </div>
            <button className="btn btn-success btn-full" type="submit" disabled={saving}>
              {saving ? <Spinner /> : 'Change Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

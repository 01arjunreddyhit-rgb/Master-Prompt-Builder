import React, { useState } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Alert, Spinner } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminProfile() {
  const { user, login, token } = useAuth();
  const [infoForm, setInfoForm] = useState({ admin_name: user?.admin_name || '', college_name: user?.college_name || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [infoMsg, setInfoMsg] = useState(null);
  const [pwMsg, setPwMsg]     = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw]     = useState(false);
  const [copied, setCopied] = useState(false);

  const setInfo = k => e => setInfoForm(f => ({ ...f, [k]: e.target.value }));
  const setPw   = k => e => setPwForm(f => ({   ...f, [k]: e.target.value }));

  const handleSaveInfo = async (e) => {
    e.preventDefault(); setSavingInfo(true); setInfoMsg(null);
    try {
      const { data } = await api.put('/admin/profile', infoForm);
      if (data.success) {
        login({ ...user, admin_name: infoForm.admin_name, college_name: infoForm.college_name }, token);
        setInfoMsg({ type: 'success', text: 'Profile updated.' });
      }
    } catch (err) { setInfoMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' }); }
    finally { setSavingInfo(false); }
  };

  const handleChangePw = async (e) => {
    e.preventDefault(); setPwMsg(null);
    if (pwForm.new_password !== pwForm.confirm) return setPwMsg({ type: 'error', text: 'Passwords do not match.' });
    if (pwForm.new_password.length < 8)          return setPwMsg({ type: 'error', text: 'Min 8 characters required.' });
    setSavingPw(true);
    try {
      const { data } = await api.put('/admin/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      if (data.success) { setPwMsg({ type: 'success', text: 'Password changed.' }); setPwForm({ current_password: '', new_password: '', confirm: '' }); }
    } catch (err) { setPwMsg({ type: 'error', text: err.response?.data?.message || 'Change failed.' }); }
    finally { setSavingPw(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(user?.admin_id || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const initial = (user?.admin_name || 'A')[0].toUpperCase();

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Admin Profile</h1>
          <p className="page-subtitle">Manage your account details</p>
        </div>

        {/* Hero identity card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--ink), var(--ink-3))',
          borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: 'white',
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 66, height: 66, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, flexShrink: 0,
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>{user?.admin_name}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 3 }}>{user?.email}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: 2 }}>{user?.college_name}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Your Admin ID</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '1.3rem', fontWeight: 700,
              letterSpacing: '3px', background: 'rgba(255,255,255,0.08)',
              padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'background 0.15s',
              color: copied ? '#86EFAC' : 'white',
            }} onClick={copyId} title="Click to copy">
              {user?.admin_id}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: 5 }}>
              {copied ? '✓ Copied!' : 'Click to copy · Share with students'}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
          {/* Profile info */}
          <div className="card">
            <div className="card-header"><span className="card-title">Profile Information</span></div>
            {infoMsg && <Alert type={infoMsg.type}>{infoMsg.text}</Alert>}
            <form onSubmit={handleSaveInfo}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-input" value={infoForm.admin_name} onChange={setInfo('admin_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Institution Name</label>
                <input className="form-input" value={infoForm.college_name} onChange={setInfo('college_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" value={user?.email} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
                <div className="form-hint">Email cannot be changed after registration.</div>
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={savingInfo}>
                {savingInfo ? <Spinner /> : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card-header"><span className="card-title">Change Password</span></div>
            {pwMsg && <Alert type={pwMsg.type}>{pwMsg.text}</Alert>}
            <form onSubmit={handleChangePw}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={pwForm.current_password} onChange={setPw('current_password')} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 characters"
                  value={pwForm.new_password} onChange={setPw('new_password')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="Repeat"
                  value={pwForm.confirm} onChange={setPw('confirm')} required />
              </div>
              <button className="btn btn-warning btn-full" type="submit" disabled={savingPw}>
                {savingPw ? <Spinner /> : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

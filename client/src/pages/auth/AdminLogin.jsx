import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', form);
      if (data.success) { login(data.user, data.token); navigate('/admin'); }
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        navigate('/verify-otp', { state: { email: form.email, role: 'admin' } });
      } else {
        setError(err.response?.data?.message || 'Login failed.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo">UC<span className="logo-accent">OS</span></div>
          <div className="tagline">Universal Course Opting System</div>
        </div>
        <h2 className="auth-title">Admin Console</h2>
        <p className="auth-sub">Institutional Governance & Allocation Control</p>

        {error && (
          <div className="animate-in" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: 12, color: '#ef4444', fontSize: '0.82rem', marginBottom: 24, textAlign: 'center', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Admin Email</label>
            <input className="form-input" type="email" placeholder="hod@college.edu"
              value={form.email} onChange={set('email')} required 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Security Key</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} required 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
          </div>
          
          <div style={{ textAlign: 'right', marginTop: -8 }}>
            <button type="button" onClick={() => setShowForgot(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Recover Access?
            </button>
          </div>

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}
            style={{ borderRadius: 14, height: 52, fontSize: '0.95rem', fontWeight: 800, marginTop: 10, boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.3)' }}>
            {loading ? <Spinner /> : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="auth-footer" style={{ fontSize: '0.8rem', color: 'var(--text-4)' }}>
            Institutional representative? <Link to="/admin/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Request Access</Link>
          </div>
          <div className="auth-footer">
            <Link to="/login" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', opacity: 0.6 }}>Student Login Portal →</Link>
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal role="admin" onClose={() => setShowForgot(false)} />}
    </div>
  );
}

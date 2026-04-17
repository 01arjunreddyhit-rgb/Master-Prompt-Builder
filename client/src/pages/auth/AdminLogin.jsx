import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

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
        <h2 className="auth-title">Admin Login</h2>
        <p className="auth-sub">Sign in to manage your institution's election</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="hod@college.edu"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} required />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          New institution? <Link to="/admin/register">Create Admin Account</Link>
        </div>
        <div className="auth-footer">
          <Link to="/login">Student Login →</Link>
        </div>
      </div>
    </div>
  );
}

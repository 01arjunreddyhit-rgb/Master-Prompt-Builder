import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';

export default function StudentLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/student';

  const [form, setForm] = useState({ email: '', password: '', admin_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/student/login', form);
      if (data.success) { login(data.user, data.token); navigate(redirect); }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow student" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo">UC<span style={{ color: 'var(--emerald)' }}>OS</span></div>
          <div className="tagline">Universal Course Opting System</div>
        </div>
        <h2 className="auth-title">Student Login</h2>
        <p className="auth-sub">Sign in to select your elective courses</p>

        {redirect !== '/student' && (
          <div className="alert alert-info" style={{ marginBottom: 16, fontSize: '0.82rem' }}>
            🔑 Login to continue to your election application
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin ID</label>
            <input className="form-input" placeholder="ADM-2026-001"
              value={form.admin_id} onChange={set('admin_id')}
              style={{ fontFamily: 'var(--mono)' }} required />
            <div className="form-hint">Provided by your institution admin</div>
          </div>
          <div className="form-group">
            <label className="form-label">Email or Register Number</label>
            <input className="form-input" placeholder="you@college.edu or 2401107109"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} required />
          </div>
          <button className="btn btn-success btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Login to Student Portal'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          New student? <Link to="/student/register" style={{ color: 'var(--emerald)' }}>Request Access</Link>
        </div>
        <div className="auth-footer">
          <Link to="/admin/login">Admin Login →</Link>
        </div>
      </div>
    </div>
  );
}

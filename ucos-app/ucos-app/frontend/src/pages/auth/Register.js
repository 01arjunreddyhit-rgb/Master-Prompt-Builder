import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';

export function AdminRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ admin_name: '', college_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/register', {
        admin_name: form.admin_name, college_name: form.college_name,
        email: form.email, password: form.password,
      });
      if (data.success) {
        navigate('/verify-otp', { state: { email: form.email, role: 'admin', admin_id: data.admin_id } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="logo">UCOS</div>
          <div className="tagline">Universal Course Opting System</div>
        </div>
        <h2 className="auth-title">Create Admin Account</h2>
        <p className="auth-sub">Register your institution to get started</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Institution Name</label>
            <input className="form-input" placeholder="Sri XYZ College of Engineering"
              value={form.college_name} onChange={set('college_name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" placeholder="Dr. Ramesh Kumar"
              value={form.admin_name} onChange={set('admin_name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Official Email</label>
            <input className="form-input" type="email" placeholder="hod@college.edu"
              value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars"
                value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat password"
                value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Register & Send OTP'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 16 }}>
          Already registered? <Link to="/admin/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get state passed via navigate()
  const { email, role, admin_id } = location.state || {};

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp, role });
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate(role === 'admin' ? '/admin/login' : '/login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email, role });
      setError(''); alert('OTP resent to ' + email);
    } catch (e) { setError('Could not resend OTP.'); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo">UCOS</div>
        </div>
        <h2 className="auth-title">Verify Your Email</h2>
        <p className="auth-sub">
          Enter the 6-digit OTP sent to <strong>{email || 'your email'}</strong>
        </p>

        {admin_id && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            Your Admin ID: <strong style={{ fontFamily: 'var(--mono)' }}>{admin_id}</strong> — save this!
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">✓ Verified! Redirecting to login...</div>}

        {!success && (
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label">OTP Code</label>
              <input className="form-input" placeholder="Enter 6-digit OTP"
                value={otp} onChange={e => setOtp(e.target.value)}
                maxLength={6} style={{ fontSize: '1.4rem', letterSpacing: '8px', textAlign: 'center' }}
                required />
              <div className="form-hint">Valid for 10 minutes</div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <Spinner /> : 'Verify OTP'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: 16 }}>
          Didn't receive it?{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
            onClick={handleResend}>Resend OTP</span>
        </div>
      </div>
    </div>
  );
}

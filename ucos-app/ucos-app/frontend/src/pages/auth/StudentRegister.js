import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';

export default function StudentRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', register_number: '', email: '',
    password: '', confirm: '', section: 'A', admin_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/student/register', {
        name: form.name, register_number: form.register_number,
        email: form.email, password: form.password,
        section: form.section, admin_id: form.admin_id,
      });
      if (data.success) {
        navigate('/verify-otp', {
          state: { email: form.email, role: 'pending_student' },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ background: 'linear-gradient(135deg, #145A32 0%, #1E8449 100%)' }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="logo">UCOS</div>
          <div className="tagline">Universal Course Opting System</div>
        </div>
        <h2 className="auth-title">Student Registration</h2>
        <p className="auth-sub">Request access to your institution's election</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin ID</label>
            <input className="form-input" placeholder="ADM-2026-001"
              value={form.admin_id} onChange={set('admin_id')}
              style={{ fontFamily: 'var(--mono)' }} required />
            <div className="form-hint">Get this from your HOD / faculty coordinator</div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Your full name"
                value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Register Number</label>
              <input className="form-input" placeholder="2301107031"
                value={form.register_number} onChange={set('register_number')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@college.edu"
                value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={form.section} onChange={set('section')}>
                {['A','B','C','D','E'].map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 6 chars"
                value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat"
                value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          <button className="btn btn-success btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Submit Registration Request'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 16 }}>
          Already registered? <Link to="/login">Login</Link>
        </div>
        <div className="alert alert-info" style={{ marginTop: 16, fontSize: '0.82rem' }}>
          After submitting, verify your email via OTP. Your account will then await admin approval before you can login.
        </div>
      </div>
    </div>
  );
}

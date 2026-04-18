import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner } from '../../components/ui/index';

export default function StudentRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', register_number: '', email: '',
    password: '', confirm: '', section: 'A'
  });
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
      const { data } = await api.post('/auth/student/register', {
        name: form.name, register_number: form.register_number,
        email: form.email, password: form.password,
        section: form.section
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
    <div className="auth-page">
      <div className="auth-bg-glow student" />
      <div className="auth-grid" />
      <div className="auth-card" style={{ maxWidth: 540 }}>
        <div className="auth-logo">
          <div className="logo">UC<span style={{ color: 'var(--emerald)' }}>OS</span></div>
          <div className="tagline">Universal Course Opting System</div>
        </div>
        <h2 className="auth-title">Student Enrollment</h2>
        <p className="auth-sub">Create your platform account to participate in elections</p>

        {error && (
          <div className="animate-in" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: 12, color: '#ef4444', fontSize: '0.82rem', marginBottom: 24, textAlign: 'center', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Full Name</label>
              <input className="form-input" placeholder="Arjun Reddy"
                value={form.name} onChange={set('name')} required 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Register Number</label>
              <input className="form-input" placeholder="2301107031"
                value={form.register_number} onChange={set('register_number')} required 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Email Address</label>
              <input className="form-input" type="email" placeholder="you@college.edu"
                value={form.email} onChange={set('email')} required 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Section</label>
              <select className="form-input" value={form.section} onChange={set('section')}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }}>
                {['A','B','C','D','E'].map(s => <option key={s} value={s} style={{ color: '#000' }}>Section {s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={set('password')} required 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Confirm</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.confirm} onChange={set('confirm')} required 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: 'white' }} />
            </div>
          </div>

          <button className="btn btn-success btn-full btn-lg" type="submit" disabled={loading}
            style={{ borderRadius: 14, height: 52, fontSize: '0.95rem', fontWeight: 800, marginTop: 10, boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)' }}>
            {loading ? <Spinner /> : 'Create Student Account'}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="auth-footer" style={{ fontSize: '0.8rem', color: 'var(--text-4)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--emerald)', fontWeight: 700 }}>Sign In</Link>
          </div>
          <div className="alert alert-info" style={{ marginTop: 8, fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(52, 211, 153, 0.1)' }}>
            ℹ️ You will need to verify your email via OTP after submission.
          </div>
        </div>
      </div>
    </div>
  );
}

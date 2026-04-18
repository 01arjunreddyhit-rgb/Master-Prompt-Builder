import React, { useState } from 'react';
import { Modal, Input, Button, Spinner, Alert } from '../ui/index';
import api from '../../services/api';

export default function ForgotPasswordModal({ onClose, role = 'student' }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      await api.post('/auth/forgot-password', { email, role });
      setStep(2);
      setMsg({ type: 'success', text: 'OTP sent to your email.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send OTP.' });
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      await api.post('/auth/reset-password', { email, role, otp, newPassword });
      setMsg({ type: 'success', text: 'Password reset successful! You can now login.' });
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Reset failed.' });
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Password Recovery" onClose={onClose} maxWidth={400}>
      <div style={{ padding: '0 8px' }}>
        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-3)', marginBottom: 20 }}>
              Enter your registered email address and we'll send you a 6-digit code to reset your password.
            </p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <Input type="email" placeholder="you@college.edu" 
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <Button variant="primary" type="submit" fullWidth disabled={loading}>
              {loading ? <Spinner /> : 'Send Reset Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-3)', marginBottom: 20 }}>
              Verify the code sent to <strong>{email}</strong> and enter your new password.
            </p>
            <div className="form-group">
              <label className="form-label">6-Digit Code</label>
              <Input placeholder="123456" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <Input type="password" placeholder="Min. 8 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <Button variant="primary" type="submit" fullWidth disabled={loading}>
              {loading ? <Spinner /> : 'Update Password'}
            </Button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%' }}
              onClick={() => setStep(1)}>← Back to Email</button>
          </form>
        )}
      </div>
    </Modal>
  );
}

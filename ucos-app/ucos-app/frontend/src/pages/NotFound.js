import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const home = user?.role === 'admin' ? '/admin'
    : user?.role === 'student' ? '/student'
    : '/';

  return (
    <div style={{
      minHeight: '100vh', background: '#F0F4F8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: '6rem', lineHeight: 1, marginBottom: 16 }}>404</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button className="btn btn-primary btn-lg" onClick={() => navigate(home)}>
        ← Back to {user ? 'Dashboard' : 'Home'}
      </button>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Spinner, Card, Input, Button, Badge, Alert } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function JoinViaCode() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('code'); // 'code' | 'search'
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [election, setElection] = useState(null);
  const [step, setStep] = useState('lookup'); // 'lookup' | 'preview' | 'done'
  const [msg, setMsg] = useState(null);

  const [adminProfile, setAdminProfile] = useState(null);

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/join/${code.trim().toUpperCase()}`);
      setElection(data.election);
      setStep('preview');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Invalid code.' });
    } finally { setLoading(false); }
  };

  const search = async () => {
    if (query.length < 2) return;
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/search/elections?q=${encodeURIComponent(query)}`);
      setResults(data.data || []);
      setAdminProfile(null);
    } catch (err) {
      setMsg({ type: 'error', text: 'Search failed.' });
    } finally { setLoading(false); }
  };

  const loadAdminProfile = async (adminId) => {
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/search/admin/${adminId}`);
      setAdminProfile(data);
      setStep('admin_profile');
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to load profile.' });
    } finally { setLoading(false); }
  };

  const apply = async () => {
    setLoading(true); setMsg(null);
    try {
      await api.post('/cav/apply', { code: election.election_code, email: user.email });
      setStep('done');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Application failed.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Find Election</h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Join an election to start course selection</p>
        </div>

        {msg && <Alert type={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}

        {step === 'lookup' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <Button variant={mode === 'code' ? 'primary' : 'surface'} onClick={() => setMode('code')}>Direct Code</Button>
              <Button variant={mode === 'search' ? 'primary' : 'surface'} onClick={() => setMode('search')}>Search Admins/Institutions</Button>
            </div>

            {mode === 'code' ? (
              <Card>
                <div className="form-group">
                  <label className="form-label">Election Code</label>
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. 4A2F9CB1" style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: 2 }} />
                </div>
                <Button variant="primary" onClick={lookupCode} loading={loading} style={{ width: '100%' }}>Look Up Election</Button>
              </Card>
            ) : (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
                    <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search admin name, college, or election..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && search()} />
                    <Button variant="primary" onClick={search} loading={loading}>Search</Button>
                  </div>
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map(r => (
                    <Card key={r.election_id} style={{ padding: '16px 20px', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover-lift" onClick={() => { setElection(r); setStep('preview'); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{r.election_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                            Managed by <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); loadAdminProfile(r.admin_id); }}>{r.admin_name}</span> · {r.college_name}
                          </div>
                        </div>
                        <Badge variant="blue">{r.status}</Badge>
                      </div>
                    </Card>
                  ))}
                  {results.length === 0 && query.length >= 2 && !loading && (
                    <EmptyState title="No matches" message="We couldn't find any elections or admins matching your search." />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'admin_profile' && adminProfile && (
          <div style={{ maxWidth: 650 }}>
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('lookup')}>← Back to Search</button>
            </div>
            <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--surface) 0%, var(--muted-bg) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.8rem', fontWeight: 800 }}>
                   {adminProfile.admin.admin_name[0]}
                </div>
                <div>
                   <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{adminProfile.admin.admin_name}</h2>
                   <div style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>{adminProfile.admin.college_name}</div>
                </div>
              </div>
            </Card>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Available Elections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {adminProfile.elections.map(e => (
                <Card key={e.election_id} style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => { setElection(e); setStep('preview'); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{e.election_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>{e.semester_tag || 'General'} · Code: {e.election_code}</div>
                    </div>
                    <Button variant="surface" className="btn-sm">View Details</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'preview' && election && (
          <div style={{ maxWidth: 500 }}>
            <Card style={{ border: '2px solid var(--accent)', background: 'var(--accent-glow)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>JOINING ELECTION</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>{election.election_name}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 20 }}>Hosted by <strong>{election.admin_name}</strong> at <strong>{election.college_name}</strong>.</p>
              
              <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', marginBottom: 8 }}>Applying as: <strong>{user.email}</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>Make sure this matches the records your admin has for you.</div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="surface" onClick={() => setStep('lookup')} style={{ flex: 1 }}>Back</Button>
                <Button variant="primary" onClick={apply} loading={loading} style={{ flex: 2 }}>Confirm & Apply</Button>
              </div>
            </Card>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Application Sent!</h2>
            <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>Your application is pending admin review. You'll receive a message when confirmed.</p>
            <Button variant="primary" onClick={() => navigate('/student/messages')}>Go to Messages</Button>
          </div>
        )}
      </main>
    </div>
  );
}

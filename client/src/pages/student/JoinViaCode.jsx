import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Spinner, Card, Input, Button, Badge, Alert } from '../../components/ui/index';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/* ── Categorical field detection ─────────────────────────────── */
const CATEGORICAL_FIELDS = ['section', 'semester', 'year', 'batch', 'department', 'stream', 'program', 'division', 'shift', 'gender'];
const isCategorical = (key) => CATEGORICAL_FIELDS.some(f => key.toLowerCase().includes(f));

/* ── Build dropdown options from all invite metadata ─────────── */
function getOptions(fieldKey, allMetadataValues) {
  const vals = [...new Set((allMetadataValues[fieldKey] || []).map(v => String(v).trim()).filter(Boolean))].sort();
  return vals;
}

/* ── Dynamic Form (Instruction 6: Uninvited students) ────────── */
function DynamicForm({ fieldKeys, allMetadataValues, formData, setFormData }) {
  if (!fieldKeys?.length) return (
    <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: '0.82rem', color: '#92400E' }}>
      No additional fields required. You can submit your application below.
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: fieldKeys.length > 3 ? '1fr 1fr' : '1fr', gap: 12 }}>
      {fieldKeys.map(key => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const opts = isCategorical(key) ? getOptions(key, allMetadataValues) : [];

        return (
          <div key={key} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ textTransform: 'capitalize' }}>{label}</label>
            {isCategorical(key) && opts.length > 1 ? (
              <select className="form-input" value={formData[key] || ''} onChange={e => setFormData(d => ({ ...d, [key]: e.target.value }))}>
                <option value="">Select {label}…</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="form-input" placeholder={`Enter ${label}…`}
                value={formData[key] || ''} onChange={e => setFormData(d => ({ ...d, [key]: e.target.value }))} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Invited student: verify pre-filled details popup (Access Gate) ── */
function InviteVerifyStep({ election, inviteMetadata, identityComparison, onConfirm, onBack, loading }) {
  const [subStep, setSubStep] = useState(1); // 1: Core Identity, 2: Supplementary
  const [editableMetadata, setEditableMetadata] = useState({ ...inviteMetadata });

  const handleFinish = () => {
    onConfirm(editableMetadata);
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', borderRadius: 18, padding: '22px 24px', marginBottom: 20, color: 'white' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.7, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 5 }}>Joining Election</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 6 }}>{election.election_name}</div>
        <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Hosted by {election.admin_name} · {election.college_name}</div>
      </div>

      <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>✦</div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#9A3412' }}>
            {subStep === 1 ? 'Identity Verification Gate (Core)' : 'Supplementary Details Verification'}
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#C2410C', lineHeight: 1.6 }}>
          {subStep === 1 
            ? "The admin has granted you access as the owner of this email. The Platform ID and Username below are auto-generated and immutable. Please verify they match your intended identity."
            : "The details below were pre-filled by the admin. You may edit them if necessary. Any changes will be highlighted (Orange) for the admin's final audit."
          }
        </div>
      </div>

      {subStep === 1 ? (
        /* Step 1: Core Identity (Immutable) */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Core Identity (Verified via Admin List)</div>
          <div style={{ background: 'var(--muted-bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-4)' }}>Gate Field</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-4)' }}>2B: Admin Given</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-4)' }}>2A: Dashboard Detail</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(identityComparison).map(([key, f]) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--border)', background: f.is_match ? '#ECFDF544' : '#FFF7ED' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{f.field_label}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: f.is_match ? '#059669' : '#EA580C' }}>{f.admin_value || '(Blank)'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {f.platform_value}
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.is_match ? '#10B981' : '#F59E0B' }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-4)', fontStyle: 'italic' }}>
            Platform ID and Username are determined by the software and cannot be changed.
          </div>
        </div>
      ) : (
        /* Step 2: Supplementary Details (Editable) */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Editable Supplementary Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {Object.entries(inviteMetadata)
              .filter(([k]) => !['email','platform_id','full_student_id','username','register_number','p_profile_id','p_username'].includes(k))
              .map(([key, adminVal]) => {
                const isMismatch = editableMetadata[key] !== adminVal;
                return (
                  <div key={key} style={{ background: isMismatch ? '#FFF7ED' : 'var(--muted-bg)', padding: '10px 12px', borderRadius: 10, border: isMismatch ? '1px solid #FFEDD5' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{key.replace(/_/g, ' ')}</div>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isMismatch ? '#F59E0B' : '#10B981' }} />
                    </div>
                    <input 
                      className="form-input" 
                      style={{ fontSize: '0.82rem', padding: '4px 0', border: 'none', background: 'transparent', width: '100%', fontWeight: 600, outline: 'none' }}
                      value={editableMetadata[key] || ''}
                      onChange={e => setEditableMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                    {isMismatch && <div style={{ fontSize: '0.5rem', color: '#C2410C', marginTop: 2 }}>Original: {adminVal || '(Blank)'}</div>}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="surface" onClick={subStep === 1 ? onBack : () => setSubStep(1)} style={{ flex: 1 }}>← Back</Button>
        <Button 
          variant="primary" 
          onClick={subStep === 1 ? () => setSubStep(2) : handleFinish} 
          loading={loading} 
          style={{ flex: 2 }}
        >
          {subStep === 1 ? 'Verify & Proceed →' : 'Confirm & Complete →'}
        </Button>
      </div>
    </div>
  );
}

/* ── Uninvited student: dynamic form ─────────────────────────── */
function UninvitedFormStep({ election, fieldKeys, allMetadataValues, onSubmit, onBack, loading }) {
  const [formData, setFormData] = useState({});

  const handleSubmit = () => {
    if (isCategorical && fieldKeys.some(k => isCategorical(k) && !formData[k])) {
      alert('Please fill all required fields.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', borderRadius: 18, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.7, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 5 }}>Registration Form</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>{election.election_name}</div>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '0.78rem', color: '#92400E', lineHeight: 1.6 }}>
        <strong>Supplementary Details Required.</strong> Please fill in your institutional details accurately. These details confirm your identity to the admin for manual approval.
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>Your Institutional Details</div>
        <DynamicForm fieldKeys={fieldKeys} allMetadataValues={allMetadataValues} formData={formData} setFormData={setFormData} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="surface" onClick={onBack} style={{ flex: 1 }}>← Back</Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>Submit for Review →</Button>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function JoinViaCode() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('code'); // 'code' | 'search'
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [election, setElection] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [msg, setMsg] = useState(null);

  // Application flow state (Instruction 5/6)
  const [applyResult, setApplyResult] = useState(null); // result from POST /cav/apply
  const [allMetadataValues, setAllMetadataValues] = useState({});

  // step: 'lookup' | 'preview' | 'invited_verify' | 'uninvited_form' | 'done'
  const [step, setStep] = useState('lookup');

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/join/${code.trim().toUpperCase()}`);
      setElection(data.election);
      setStep('preview');
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Invalid code.' }); }
    finally { setLoading(false); }
  };

  const search = async () => {
    if (query.length < 2) return;
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/search/elections?q=${encodeURIComponent(query)}`);
      setResults(data.data || []);
      setAdminProfile(null);
    } catch { setMsg({ type: 'error', text: 'Search failed.' }); }
    finally { setLoading(false); }
  };

  const loadAdminProfile = async (adminId) => {
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get(`/search/admin/${adminId}`);
      setAdminProfile(data); setStep('admin_profile');
    } catch { setMsg({ type: 'error', text: 'Failed to load profile.' }); }
    finally { setLoading(false); }
  };

  // Step 1: apply to election → get invite status
  const apply = async () => {
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.post('/cav/apply', {
        code: election.election_code || code.trim().toUpperCase(),
        email: user.email,
      });
      setApplyResult(data);

      if (data.is_invited) {
        // Invited → show verification popup
        setStep('invited_verify');
      } else {
        // Uninvited → show dynamic form
        // Build allMetadataValues for dropdown options
        if (data.field_keys?.length) {
          const opts = {};
          // We don't have all values at this point; the form will show inputs
          data.field_keys.forEach(k => { opts[k] = []; });
          setAllMetadataValues(opts);
        }
        setStep('uninvited_form');
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.existing) {
        setMsg({ type: 'info', text: 'You have already applied to this election.' });
        setStep('done');
      } else {
        setMsg({ type: 'error', text: errData?.message || 'Application failed.' });
      }
    }
    finally { setLoading(false); }
  };

  // Step 2a: Invited student confirms
  const confirmInvited = async (metadata) => {
    setLoading(true); setMsg(null);
    try {
      // Build identity audit payload for Step 1 (Core Identity)
      const audit = Object.entries(applyResult.identity_comparison || {}).map(([key, f]) => ({
        key: f.field_label,
        admin_value: f.admin_value,
        student_value: f.platform_value,
        is_mismatch: !f.is_match
      }));

      // Add Step 2 (Supplementary Details) mismatches to audit
      Object.entries(applyResult.invite_metadata || {}).forEach(([key, adminVal]) => {
        if (!['email','platform_id','full_student_id','username','register_number','p_profile_id','p_username'].includes(key)) {
          if (metadata[key] !== adminVal) {
            audit.push({
              key: key.replace(/_/g, ' ').toUpperCase(),
              admin_value: adminVal,
              student_value: metadata[key],
              is_mismatch: true
            });
          }
        }
      });

      await api.post('/cav/confirm-participation', { 
        election_id: applyResult.election_id, 
        metadata, 
        identity_audit: audit 
      });
      setStep('done');
    } catch (err) { 
      setMsg({ type: 'error', text: err.response?.data?.message || 'Verification failed.' }); 
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Uninvited student submits form
  const submitUninvitedForm = async (formData) => {
    setLoading(true); setMsg(null);
    try {
      await api.post('/cav/form', { election_id: applyResult.election_id, form_data: formData });
      setStep('done');
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Form submission failed.' }); }
    finally { setLoading(false); }
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

        {/* ── STEP: lookup ── */}
        {step === 'lookup' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <Button variant={mode === 'code' ? 'primary' : 'surface'} onClick={() => setMode('code')}>Direct Code</Button>
              <Button variant={mode === 'search' ? 'primary' : 'surface'} onClick={() => setMode('search')}>Search Admins / Institutions</Button>
            </div>

            {mode === 'code' ? (
              <Card>
                <div className="form-group">
                  <label className="form-label">Election Code</label>
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 4A2F9CB1"
                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: 2 }}
                    onKeyDown={e => e.key === 'Enter' && lookupCode()} />
                </div>
                <Button variant="primary" onClick={lookupCode} loading={loading} style={{ width: '100%' }}>Look Up Election</Button>
              </Card>
            ) : (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
                    <Input value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Search admin name, college, or election..."
                      style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && search()} />
                    <Button variant="primary" onClick={search} loading={loading}>Search</Button>
                  </div>
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map(r => (
                    <Card key={r.election_id} style={{ padding: '16px 20px', cursor: 'pointer' }}
                      onClick={() => { setElection(r); setStep('preview'); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.election_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                            Managed by{' '}
                            <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); loadAdminProfile(r.admin_id); }}>
                              {r.admin_name}
                            </span>{' '}· {r.college_name}
                          </div>
                        </div>
                        <Badge variant="blue">{r.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: admin_profile ── */}
        {step === 'admin_profile' && adminProfile && (
          <div style={{ maxWidth: 650 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('lookup')} style={{ marginBottom: 20 }}>← Back to Search</button>
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800 }}>
                  {adminProfile.admin.admin_name[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{adminProfile.admin.admin_name}</h2>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.86rem' }}>{adminProfile.admin.college_name}</div>
                </div>
              </div>
            </Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Available Elections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {adminProfile.elections.map(e => (
                <Card key={e.election_id} style={{ padding: '16px 20px', cursor: 'pointer' }}
                  onClick={() => { setElection(e); setStep('preview'); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{e.election_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>{e.semester_tag || 'General'} · Code: {e.election_code}</div>
                    </div>
                    <Button variant="surface" className="btn-sm">View</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: preview (confirm & apply) ── */}
        {step === 'preview' && election && (
          <div style={{ maxWidth: 500 }}>
            <Card style={{ border: '2px solid var(--accent)', background: 'var(--accent-glow)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>JOINING ELECTION</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 10 }}>{election.election_name}</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginBottom: 20 }}>
                Hosted by <strong>{election.admin_name}</strong> at <strong>{election.college_name}</strong>.
              </p>
              <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', marginBottom: 6 }}>Applying as: <strong>{user.email}</strong></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', lineHeight: 1.5 }}>
                  Your email is used for identity verification. Make sure it matches your admin's records.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="surface" onClick={() => setStep('lookup')} style={{ flex: 1 }}>Back</Button>
                <Button variant="primary" onClick={apply} loading={loading} style={{ flex: 2 }}>Confirm & Apply →</Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP: invited_verify ── */}
        {step === 'invited_verify' && applyResult && (
          <InviteVerifyStep election={election}
            inviteMetadata={applyResult.invite_metadata}
            identityComparison={applyResult.identity_comparison}
            onConfirm={confirmInvited} onBack={() => setStep('preview')} loading={loading} />
        )}

        {/* ── STEP: uninvited_form ── */}
        {step === 'uninvited_form' && applyResult && (
          <UninvitedFormStep election={election}
            fieldKeys={applyResult.field_keys}
            allMetadataValues={allMetadataValues}
            onSubmit={submitUninvitedForm} onBack={() => setStep('preview')} loading={loading} />
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
              {applyResult?.is_invited ? 'Application Confirmed!' : 'Application Submitted for Review!'}
            </h2>
            <p style={{ color: 'var(--text-3)', marginBottom: 8, maxWidth: 400, margin: '0 auto 20px' }}>
              {applyResult?.is_invited
                ? 'You were on the invite list. Your application is pending admin confirmation.'
                : 'Your form has been submitted. Since you were not on the initial invite list, your admin will review your details before confirming access.'
              }
            </p>
            <Button variant="primary" onClick={() => navigate('/student/messages')}>Go to Messages →</Button>
          </div>
        )}

      </main>
    </div>
  );
}

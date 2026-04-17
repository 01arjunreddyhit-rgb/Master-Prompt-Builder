import React, { useState, useEffect } from 'react';
import { StudentSidebar } from '../../components/ui/Sidebar';
import { Badge, Spinner, EmptyState, TokenChip } from '../../components/ui/index';
import api from '../../services/api';

const STATUS_VARIANT = {
  UNUSED: 'grey', BOOKED: 'blue', CONFIRMED: 'green',
  BURST: 'red', AUTO: 'purple',
};

export default function StudentBookings() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/bookings')
      .then(r => setTokens(r.data.data || []))
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false));
  }, []);

  const used    = tokens.filter(t => t.status !== 'UNUSED');
  const unused  = tokens.filter(t => t.status === 'UNUSED');
  const confirmed = tokens.filter(t => ['CONFIRMED', 'AUTO'].includes(t.status));
  const burst   = tokens.filter(t => t.status === 'BURST');

  const electionName = tokens[0]?.election_name || '';
  const electionStatus = tokens[0]?.election_status || '';

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">

        <div className="page-header">
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">
            {electionName && `${electionName} · `}
            {used.length} of {tokens.length} tokens used
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : tokens.length === 0 ? (
          <EmptyState icon="🎫" title="No tokens yet"
            message="Tokens are created when your admin initialises the election." />
        ) : (
          <>
            {/* Stats row */}
            <div className="stat-grid mb-4">
              <div className="stat-card">
                <div className="stat-label">Total Tokens</div>
                <div className="stat-value">{tokens.length}</div>
              </div>
              <div className="stat-card green">
                <div className="stat-label">Confirmed</div>
                <div className="stat-value">{confirmed.length}</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-label">Booked (pending)</div>
                <div className="stat-value">{tokens.filter(t => t.status === 'BOOKED').length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining</div>
                <div className="stat-value">{unused.length}</div>
              </div>
              {burst.length > 0 && (
                <div className="stat-card red">
                  <div className="stat-label">Burst / Cascaded</div>
                  <div className="stat-value">{burst.length}</div>
                </div>
              )}
            </div>

            {/* Visual token row */}
            <div className="card mb-4">
              <div className="card-header">
                <span className="card-title">Token Overview</span>
                {electionStatus && (
                  <span className={`badge badge-${
                    electionStatus === 'ACTIVE' ? 'green' :
                    electionStatus === 'STOPPED' ? 'red' :
                    electionStatus === 'PAUSED' ? 'orange' : 'grey'
                  }`}>{electionStatus}</span>
                )}
              </div>
              <div className="token-bar">
                {tokens.map(t => (
                  <TokenChip key={t.token_id} number={t.token_number}
                    status={t.status} courseName={t.course_name} />
                ))}
              </div>
              {unused.length > 0 && electionStatus === 'ACTIVE' && (
                <p className="text-sm text-muted mt-2">
                  💡 You have <strong>{unused.length}</strong> token{unused.length !== 1 ? 's' : ''} remaining.
                  Go to <strong>Dashboard</strong> to book more courses.
                </p>
              )}
              {electionStatus === 'STOPPED' && confirmed.length === 0 && (
                <div className="alert alert-warning mt-2">
                  Election has ended. Allocation is in progress — check <strong>My Results</strong> soon.
                </div>
              )}
            </div>

            {/* Detailed table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Token Detail</span>
                <span className="badge badge-grey">{tokens.length} tokens</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Course</th>
                      <th>Code</th>
                      <th>Seat</th>
                      <th>Status</th>
                      <th>Booked At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map(t => (
                      <tr key={t.token_id}>
                        <td>
                          <span className="code-chip">{t.token_code}</span>
                        </td>
                        <td>
                          {t.course_name
                            ? <strong>{t.course_name}</strong>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {t.subject_code
                            ? <span className="code-chip">{t.subject_code}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {t.seat_code
                            ? <span className="code-chip">{t.seat_code}</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <Badge variant={STATUS_VARIANT[t.status] || 'grey'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="text-sm text-muted">
                          {t.timestamp_booked
                            ? new Date(t.timestamp_booked).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

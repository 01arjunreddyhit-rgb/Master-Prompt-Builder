import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Badge, EmptyState, Spinner, Modal } from '../../components/ui/index';
import api from '../../services/api';

const TOKEN_VARIANT = { UNUSED: 'grey', BOOKED: 'blue', CONFIRMED: 'green', BURST: 'red', AUTO: 'purple' };

// ── STUDENT DETAIL MODAL ──────────────────────────────────────
function StudentDetailModal({ studentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/students/${studentId}`)
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <Modal title="Student Detail" onClose={onClose} maxWidth={600}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner dark /></div>
      ) : !data ? (
        <div className="alert alert-error">Could not load student data.</div>
      ) : (
        <>
          {/* Student info grid */}
          <div style={{
            background: 'var(--lgrey)', borderRadius: 10, padding: '16px 18px', marginBottom: 20,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
          }}>
            {[
              ['Full Name',    data.name],
              ['Student ID',   data.full_student_id],
              ['Register No.', data.register_number],
              ['Section',      `Section ${data.section}`],
              ['Email',        data.email],
              ['Election',     data.election_name || 'Not assigned'],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="stat-label">{label}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: 2, color: 'var(--navy)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Token activity */}
          <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>Token Activity</div>

          {!data.tokens?.length ? (
            <div className="alert alert-info">No tokens generated yet. Run Initialise in Election Control.</div>
          ) : (
            <>
              <div className="token-bar" style={{ marginBottom: 16 }}>
                {data.tokens.map(t => (
                  <div key={t.token_id}
                    className={`token-chip ${(t.status || 'UNUSED').toLowerCase()}`}
                    title={t.course_name || `Token T${t.token_number}`}>
                    <span className="t-num">T{t.token_number}</span>
                    <span className="t-status">{(t.status || 'UNUSED').toLowerCase()}</span>
                  </div>
                ))}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Token</th><th>Course</th><th>Seat</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.tokens.map(t => (
                      <tr key={t.token_id}>
                        <td><span className="code-chip">{t.token_code}</span></td>
                        <td>{t.course_name || <span className="text-muted">—</span>}</td>
                        <td>{t.seat_code
                          ? <span className="code-chip">{t.seat_code}</span>
                          : <span className="text-muted">—</span>}</td>
                        <td><Badge variant={TOKEN_VARIANT[t.status] || 'grey'}>{t.status || 'UNUSED'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function AdminStudents() {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [search, setSearch]         = useState('');
  const [section, setSection]       = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [viewId, setViewId]         = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)  params.set('search', search);
    if (section) params.set('section', section);
    api.get(`/admin/students?${params}`)
      .then(r => setStudents(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, section]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/admin/students/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult({ ok: true, msg: data.message });
      load();
    } catch (err) {
      setUploadResult({ ok: false, msg: err.response?.data?.message || 'Upload failed.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/students/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  // Section breakdown
  const sectionMap = students.reduce((acc, s) => {
    acc[s.section] = (acc[s.section] || 0) + 1;
    return acc;
  }, {});

  const confirmedCount = students.filter(s => (s.confirmed_count || 0) > 0).length;

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">

        {/* Header */}
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Students</h1>
            <p className="page-subtitle">
              {students.length} registered · {confirmedCount} with confirmed courses
            </p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".csv" ref={fileRef}
              onChange={handleCSVUpload} style={{ display: 'none' }} />
            <button className="btn btn-primary"
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Spinner /> Uploading…</> : '⬆ Upload CSV'}
            </button>
          </div>
        </div>

        {/* Upload feedback */}
        {uploadResult && (
          <div className={`alert alert-${uploadResult.ok ? 'success' : 'error'}`}
            style={{ cursor: 'pointer' }} onClick={() => setUploadResult(null)}>
            {uploadResult.msg} <span style={{ float: 'right', fontWeight: 700 }}>✕</span>
          </div>
        )}

        {/* CSV format reference */}
        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title">CSV Upload Format</span>
            <span className="badge badge-blue">Accepted columns</span>
          </div>
          <code style={{
            display: 'block', fontSize: '0.8rem', fontFamily: 'var(--mono)',
            background: 'var(--lgrey)', padding: '12px 16px', borderRadius: 8,
            color: 'var(--navy)', lineHeight: 2,
          }}>
            serial_no, register_number, name, email, password, section<br />
            1, 2301107031, Ranveer S, ranveer@institution.edu, pass123, A<br />
            2, 2301107032, Priya S, priya@college.edu, pass456, B
          </code>
          <p className="text-xs text-muted" style={{ marginTop: 8 }}>
            <strong>password</strong> column is optional — defaults to <code>ucos@123</code>.
            Duplicate emails and register numbers are skipped automatically.
            Students are linked to the current <strong>NOT_STARTED</strong> election automatically.
          </p>
        </div>

        {/* Section summary */}
        {Object.keys(sectionMap).length > 0 && (
          <div className="stat-grid mb-4">
            <div className="stat-card">
              <div className="stat-label">Total Students</div>
              <div className="stat-value">{students.length}</div>
              <div className="stat-sub">all sections</div>
            </div>
            {Object.entries(sectionMap).sort().map(([sec, cnt]) => (
              <div key={sec} className="stat-card green">
                <div className="stat-label">Section {sec}</div>
                <div className="stat-value">{cnt}</div>
                <div className="stat-sub">students</div>
              </div>
            ))}
          </div>
        )}

        {/* Students table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Students</span>
            <div className="flex gap-2">
              <input className="form-input" placeholder="Search name or reg no…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 210 }} />
              <select className="form-select" value={section}
                onChange={e => setSection(e.target.value)} style={{ width: 140 }}>
                <option value="">All Sections</option>
                {['A','B','C','D','E'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 52 }}><Spinner dark /></div>
          ) : students.length === 0 ? (
            <EmptyState icon="👥" title="No students yet"
              message="Upload a CSV file to add students in bulk, or wait for self-registrations." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Register No.</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Section</th>
                    <th>Email</th>
                    <th>Booked</th>
                    <th>Confirmed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.student_id}>
                      <td><span className="code-chip">{s.register_number}</span></td>
                      <td><span className="code-chip">{s.full_student_id}</span></td>
                      <td>
                        <button onClick={() => setViewId(s.student_id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontWeight: 600, color: 'var(--accent)', fontSize: '0.875rem',
                          textDecoration: 'underline', fontFamily: 'var(--font)', padding: 0,
                        }}>{s.name}</button>
                      </td>
                      <td><Badge variant="blue">Sec {s.section}</Badge></td>
                      <td className="text-sm text-muted">{s.email}</td>
                      <td>
                        <span style={{ fontWeight: s.booked_count > 0 ? 700 : 400 }}>
                          {s.booked_count || 0}
                        </span>
                      </td>
                      <td>
                        {(s.confirmed_count || 0) > 0
                          ? <Badge variant="green">{s.confirmed_count} ✓</Badge>
                          : <Badge variant="grey">0</Badge>}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => setViewId(s.student_id)}>View</button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(s.student_id, s.name)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student detail modal */}
        {viewId && (
          <StudentDetailModal studentId={viewId} onClose={() => setViewId(null)} />
        )}
      </main>
    </div>
  );
}

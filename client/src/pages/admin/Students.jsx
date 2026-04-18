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
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [search, setSearch]         = useState('');
  const [section, setSection]       = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [viewId, setViewId]         = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
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

  useEffect(() => {
    setSelectedStudentIds((current) =>
      current.filter((studentId) => students.some((student) => student.student_id === studentId))
    );
  }, [students]);

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
      setUploadResult({ ok: true, msg: [data.message, ...(data.notes || [])].join(' ') });
      load();
    } catch (err) {
      const response = err.response?.data;
      const detailText = response?.errors?.length ? ` ${response.errors.join(' ')}` : '';
      setUploadResult({ ok: false, msg: `${response?.message || 'Upload failed.'}${detailText}` });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/students/${id}`);
      setSelectedStudentIds((current) => current.filter((studentId) => studentId !== id));
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const visibleStudentIds = students.map((student) => student.student_id);
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((studentId) => selectedStudentIds.includes(studentId));

  const toggleSelectAllVisible = () => {
    setSelectedStudentIds((current) => {
      if (allVisibleSelected) {
        return current.filter((studentId) => !visibleStudentIds.includes(studentId));
      }
      return Array.from(new Set([...current, ...visibleStudentIds]));
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedStudentIds.length) return;
    if (!window.confirm(`Remove ${selectedStudentIds.length} selected students? This cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      await api.post('/admin/students/bulk-delete', { student_ids: selectedStudentIds });
      setSelectedStudentIds([]);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setBulkDeleting(false);
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
            <h1 className="page-title">Invite List Management</h1>
            <p className="page-subtitle">
              {students.length} participants invited · {confirmedCount} with confirmed courses
            </p>
          </div>
          <div className="flex gap-2">
            {!!selectedStudentIds.length && (
              <button className="btn btn-danger"
                onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? <><Spinner /> Removing...</> : `Remove Selected (${selectedStudentIds.length})`}
              </button>
            )}
            <input type="file" accept=".csv" ref={fileRef}
              onChange={handleCSVUpload} style={{ display: 'none' }} />
            <button className="btn btn-primary"
              onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Spinner /> Uploading...</> : 'Upload Participant CSV'}
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
            <span className="card-title">Institution CSV Upload Format</span>
            <span className="badge badge-blue">Accepted columns</span>
          </div>
          <code style={{
            display: 'block', fontSize: '0.8rem', fontFamily: 'var(--mono)',
            background: 'var(--lgrey)', padding: '12px 16px', borderRadius: 8,
            color: 'var(--navy)', lineHeight: 2,
          }}>
            serial_no, register_number, name, email, section<br />
            1, 2301107031, Harikrishna K, hari@college.edu, A<br />
            2, 2301107032, Priya S, priya@college.edu, B
          </code>
          <p className="text-xs text-muted" style={{ marginTop: 8 }}>
            ℹ <strong>Passwords</strong> are managed by the platform. Admins provide the email/identity list only. 
            Verification is handled automatically during participant login.
            Duplicates are updated automatically. Linked to current <strong>NOT_STARTED</strong> election.
          </p>
        </div>

        {/* Students table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Invited Participants</span>
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
            <EmptyState icon="👥" title="No participants yet"
              message="Upload a CSV file to add participants in bulk, or wait for self-registrations." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 52 }}>
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
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
                      <td>
                        <input type="checkbox" checked={selectedStudentIds.includes(s.student_id)} onChange={() => toggleStudentSelection(s.student_id)} />
                      </td>
                      <td><span className="code-chip">{s.register_number}</span></td>
                      <td><span className="code-chip">{s.full_student_id}</span></td>
                      <td>
                        <button onClick={() => setViewId(s.student_id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--accent)', textDecoration: 'underline', padding: 0,
                        }}>{s.name}</button>
                      </td>
                      <td><Badge variant="blue">Sec {s.section}</Badge></td>
                      <td className="text-sm text-muted">{s.email}</td>
                      <td>{s.booked_count || 0}</td>
                      <td>
                        {(s.confirmed_count || 0) > 0
                          ? <Badge variant="green">{s.confirmed_count} ✓</Badge>
                          : <Badge variant="grey">0</Badge>}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewId(s.student_id)}>View</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.student_id, s.name)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {viewId && <StudentDetailModal studentId={viewId} onClose={() => setViewId(null)} />}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Spinner, Modal, EmptyState } from '../../components/ui/index';
import api from '../../services/api';

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ faculty_name: '', email: '', department: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/faculty')
      .then(r => setFaculty(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ faculty_name: '', email: '', department: '' });
    setShowModal(true);
  };

  const openEdit = (f) => {
    setEditItem(f);
    setForm({ faculty_name: f.faculty_name, email: f.email || '', department: f.department || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.faculty_name) return alert('Name is required.');
    setSaving(true);
    try {
      if (editItem) await api.put(`/faculty/${editItem.faculty_id}`, form);
      else await api.post('/faculty', form);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete faculty member "${name}"?`)) return;
    try {
      await api.delete(`/faculty/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text)', marginBottom: 4 }}>Faculty Management</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>Manage faculty members and their assignments.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Faculty</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spinner dark /></div>
        ) : faculty.length === 0 ? (
          <EmptyState icon="👨‍🏫" title="No faculty found" message="Add faculty members to assign them to study groups." />
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.map(f => (
                    <tr key={f.faculty_id}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{f.faculty_name}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{f.email || '—'}</td>
                      <td><span className="badge badge-grey">{f.department || 'General'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.faculty_id, f.faculty_name)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <Modal title={editItem ? 'Edit Faculty' : 'Add Faculty'} onClose={() => setShowModal(false)}
            footer={<><button className="btn btn-surface btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : 'Save'}</button></>}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Dr. Jane Smith" value={form.faculty_name} onChange={e => setForm({ ...form, faculty_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="jane.smith@college.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" placeholder="Computer Science" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

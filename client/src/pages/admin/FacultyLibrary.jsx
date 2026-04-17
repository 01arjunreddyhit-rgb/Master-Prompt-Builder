import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, Button, Input, Modal, LoadingScreen } from '../../components/ui/index';

export default function FacultyLibrary() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', department: '', specialization: '' });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/admin/faculty');
      setFaculty(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/faculty/${editing.faculty_id}`, formData);
      } else {
        await api.post('/admin/faculty', formData);
      }
      fetchFaculty();
      setShowModal(false);
      setEditing(null);
      setFormData({ name: '', department: '', specialization: '' });
    } catch (err) {
      alert('Error saving faculty');
    }
  };

  const handleEdit = (f) => {
    setEditing(f);
    setFormData({ name: f.name, department: f.department, specialization: f.specialization });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this faculty member from library?')) return;
    try {
      await api.delete(`/admin/faculty/${id}`);
      fetchFaculty();
    } catch (err) {
      alert('Error deleting faculty');
    }
  };

  const filtered = faculty.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.department.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Library</h1>
          <p className="page-subtitle">Global repository for managing faculty and specializations</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">Add Faculty member</Button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Input 
          placeholder="Search faculty by name or department..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon="🔍"
        />
      </div>

      <div className="grid grid-3">
        {filtered.map(f => (
          <Card key={f.faculty_id} className="faculty-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="faculty-avatar">{f.name.charAt(0)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(f.faculty_id)} style={{ color: 'var(--red)' }}>Del</Button>
              </div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{f.name}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8 }}>{f.department}</div>
            <div className="badge-outline">{f.specialization || 'General'}</div>
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Faculty" : "Add Faculty member"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input 
              label="Full Name" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <Input 
              label="Department" 
              required 
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
            <Input 
              label="Specialization" 
              value={formData.specialization}
              onChange={(e) => setFormData({...formData, specialization: e.target.value})}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>{editing ? "Save Changes" : "Create Record"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .faculty-card {
          transition: transform 0.2s;
        }
        .faculty-card:hover {
          transform: translateY(-4px);
        }
        .faculty-avatar {
          width: 40px;
          height: 40px;
          background: var(--accent-gradient);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
        }
        .badge-outline {
          display: inline-block;
          padding: 2px 8px;
          border: 1px solid var(--border-1);
          border-radius: 12px;
          font-size: 0.75rem;
          color: var(--text-2);
          background: var(--bg-2);
        }
      `}</style>
    </div>
  );
}

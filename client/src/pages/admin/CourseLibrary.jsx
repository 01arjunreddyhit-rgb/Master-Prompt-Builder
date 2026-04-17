import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, Button, Input, Modal, LoadingScreen } from '../../components/ui/index';

export default function CourseLibrary() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ course_name: '', subject_code: '', department: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/admin/library');
      setCourses(res.data.data || []);
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
        await api.put(`/admin/library/${editing.library_id}`, formData);
      } else {
        await api.post('/admin/library', formData);
      }
      fetchCourses();
      setShowModal(false);
      setEditing(null);
      setFormData({ course_name: '', subject_code: '', department: '' });
    } catch (err) {
      alert('Error saving course');
    }
  };

  const handleEdit = (c) => {
    setEditing(c);
    setFormData({ course_name: c.course_name, subject_code: c.subject_code, department: c.department });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this course from global library?')) return;
    try {
      await api.delete(`/admin/library/${id}`);
      fetchCourses();
    } catch (err) {
      alert('Error deleting course');
    }
  };

  const filtered = courses.filter(c => 
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject_code.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Course Repository</h1>
          <p className="page-subtitle">Master database of all available institutional electives</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">Add New Course</Button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Input 
          placeholder="Search by name, code or department..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon="🔍"
        />
      </div>

      <div className="grid grid-3">
        {filtered.map(c => (
          <Card key={c.library_id} className="course-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="course-icon-box">{c.subject_code.slice(0, 2)}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.library_id)} style={{ color: 'var(--red)' }}>Del</Button>
              </div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{c.course_name}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8 }}>{c.subject_code}</div>
            <div className="badge-outline">{c.department}</div>
          </Card>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Repository Course" : "Add Course to Repository"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input 
              label="Course Name" 
              required 
              value={formData.course_name}
              onChange={(e) => setFormData({...formData, course_name: e.target.value})}
            />
            <Input 
              label="Subject Code" 
              required 
              value={formData.subject_code}
              onChange={(e) => setFormData({...formData, subject_code: e.target.value})}
            />
            <Input 
              label="Department" 
              required 
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>{editing ? "Save Changes" : "Create Record"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        .course-card {
          transition: transform 0.2s;
        }
        .course-card:hover {
          transform: translateY(-4px);
        }
        .course-icon-box {
          width: 36px;
          height: 36px;
          background: var(--bg-3);
          border: 1px solid var(--border-1);
          color: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
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

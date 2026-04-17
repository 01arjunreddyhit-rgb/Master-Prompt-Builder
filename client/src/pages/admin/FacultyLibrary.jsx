import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Card, Button, Input, Modal, LoadingScreen, Alert } from '../../components/ui/index';

export default function FacultyLibrary() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [formData, setFormData] = useState({ 
    faculty_name: '', 
    email: '', 
    department: '' 
  });

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/faculty');
      setFaculty(res.data.data || []);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to fetch faculty list.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/faculty/${editing.faculty_id}`, formData);
        setMsg({ type: 'success', text: 'Faculty record updated.' });
      } else {
        await api.post('/faculty', formData);
        setMsg({ type: 'success', text: 'New faculty member added.' });
      }
      fetchFaculty();
      setShowModal(false);
      setEditing(null);
      setFormData({ faculty_name: '', email: '', department: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving faculty member.' });
    }
  };

  const handleEdit = (f) => {
    setEditing(f);
    setFormData({ 
      faculty_name: f.faculty_name, 
      email: f.email || '', 
      department: f.department || '' 
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this faculty member?')) return;
    try {
      await api.delete(`/faculty/${id}`);
      setMsg({ type: 'success', text: 'Faculty member removed.' });
      fetchFaculty();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error deleting faculty member.' });
    }
  };

  const filtered = faculty.filter(f => 
    f.faculty_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.department && f.department.toLowerCase().includes(search.toLowerCase()))
  );


  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header" style={{ marginBottom: 32 }}>
            <div>
              <h1 className="page-title" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Faculty Library</h1>
              <p className="page-subtitle" style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>Global repository for managing faculty and specializations</p>
            </div>
            <Button onClick={() => { setEditing(null); setFormData({ faculty_name: '', email: '', department: '' }); setShowModal(true); }} variant="primary" style={{ padding: '12px 24px', borderRadius: 12 }}>Add Faculty member</Button>
          </div>

          {msg && <Alert type={msg.type} onClose={() => setMsg(null)} style={{ marginBottom: 24 }}>{msg.text}</Alert>}

          {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><LoadingScreen /></div>
          ) : (
            <>

          <div style={{ marginBottom: 32, background: 'var(--surface)', padding: 12, borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <Input 
              placeholder="Search faculty by name or department..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="🔍"
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-2)', borderRadius: 24, border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>👨‍🏫</div>
              <h3 style={{ color: 'var(--text-2)' }}>No faculty found</h3>
              <p style={{ color: 'var(--text-4)' }}>Register your faculty members to assign them to courses and class rooms.</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 24 }}>
              {filtered.map(f => (
                <Card key={f.faculty_id} className="faculty-card" style={{ padding: 24, borderRadius: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div className="faculty-avatar">{f.faculty_name.charAt(0)}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(f)} style={{ padding: '6px 12px' }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(f.faculty_id)} style={{ color: 'var(--red)', padding: '6px 12px' }}>Del</Button>
                    </div>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{f.faculty_name}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-3)', marginBottom: 16 }}>{f.department || 'General Dept.'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-4)', fontFamily: 'var(--mono)' }}>{f.email || 'No email provided'}</div>
                </Card>
              ))}
            </div>
          )}

          {showModal && (
            <Modal title={editing ? "Edit Faculty Member" : "Add Faculty member"} onClose={() => setShowModal(false)} maxWidth="450px">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input 
                  label="Full Name" 
                  required 
                  placeholder="e.g. Dr. Robert Oppenheimer"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({...formData, faculty_name: e.target.value})}
                />
                <Input 
                  label="Email Address" 
                  type="email"
                  placeholder="e.g. robert@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <Input 
                  label="Department" 
                  placeholder="e.g. Theoretical Physics"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                />
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <Button type="submit" variant="primary" style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 700 }}>{editing ? "Save Changes" : "Create Record"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)} style={{ height: 48, borderRadius: 12 }}>Cancel</Button>
                </div>
              </form>
            </Modal>
          )}

          <style>{`
            .faculty-card {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: var(--surface);
              border: 1px solid var(--border);
            }
            .faculty-card:hover {
              transform: translateY(-8px);
              box-shadow: var(--shadow-lg);
              border-color: var(--accent-3);
            }
            .faculty-avatar {
              width: 48px;
              height: 48px;
              background: var(--accent-gradient);
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 1.4rem;
              box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            }
          `}</style>
          </>}
        </div>
      </main>
    </div>
  );
}

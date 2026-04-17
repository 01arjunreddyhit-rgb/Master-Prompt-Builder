import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AdminSidebar } from '../../components/ui/Sidebar';
import { Card, Button, Input, Modal, LoadingScreen, Alert } from '../../components/ui/index';

export default function CourseLibrary() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [formData, setFormData] = useState({ 
    course_name: '', 
    subject_code: '', 
    description: '',
    min_enrollment: 45,
    max_enrollment: 75,
    classes_per_course: 1,
    credit_weight: 3.0
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses/library');
      setCourses(res.data.data || []);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to fetch course repository.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/courses/library/${editing.library_course_id}`, formData);
        setMsg({ type: 'success', text: 'Course updated successfully.' });
      } else {
        await api.post('/courses/library', formData);
        setMsg({ type: 'success', text: 'Course added to repository.' });
      }
      fetchCourses();
      setShowModal(false);
      setEditing(null);
      resetForm();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving course.' });
    }
  };

  const resetForm = () => {
    setFormData({ 
      course_name: '', 
      subject_code: '', 
      description: '',
      min_enrollment: 45,
      max_enrollment: 75,
      classes_per_course: 1,
      credit_weight: 3.0
    });
  };

  const handleEdit = (c) => {
    setEditing(c);
    setFormData({ 
      course_name: c.course_name, 
      subject_code: c.subject_code || '', 
      description: c.description || '',
      min_enrollment: c.min_enrollment || 45,
      max_enrollment: c.max_enrollment || 75,
      classes_per_course: c.classes_per_course || 1,
      credit_weight: c.credit_weight || 3.0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this course from global library? This won\'t affect active elections.')) return;
    try {
      await api.delete(`/courses/library/${id}`);
      setMsg({ type: 'success', text: 'Course removed from library.' });
      fetchCourses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting course.' });
    }
  };

  const filtered = courses.filter(c => 
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.subject_code && c.subject_code.toLowerCase().includes(search.toLowerCase()))
  );



  return (
    <div className="app-shell">
      <AdminSidebar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header" style={{ marginBottom: 32 }}>
            <div>
              <h1 className="page-title" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Course Repository</h1>
              <p className="page-subtitle" style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>Master database of all available institutional electives</p>
            </div>
            <Button onClick={() => { setEditing(null); resetForm(); setShowModal(true); }} variant="primary" style={{ padding: '12px 24px', borderRadius: 12 }}>Add New Course</Button>
          </div>

          {msg && <Alert type={msg.type} onClose={() => setMsg(null)} style={{ marginBottom: 24 }}>{msg.text}</Alert>}

          {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><LoadingScreen /></div>
          ) : (
            <>

          <div style={{ marginBottom: 32, background: 'var(--surface)', padding: 12, borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <Input 
              placeholder="Search by course name, code or department..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="🔍"
              style={{ border: 'none', background: 'transparent' }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-2)', borderRadius: 24, border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📚</div>
              <h3 style={{ color: 'var(--text-2)' }}>No courses found</h3>
              <p style={{ color: 'var(--text-4)' }}>Start building your global course library by adding your first elective.</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 24 }}>
              {filtered.map(c => (
                <Card key={c.library_course_id} className="course-card" style={{ padding: 24, borderRadius: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div className="course-icon-box">{c.subject_code ? c.subject_code.slice(0, 2) : '??'}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} style={{ padding: '6px 12px' }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.library_course_id)} style={{ color: 'var(--red)', padding: '6px 12px' }}>Del</Button>
                    </div>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>{c.course_name}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-4)', fontFamily: 'var(--mono)', marginBottom: 16 }}>{c.subject_code || 'No Code'}</div>
                  
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div className="badge-outline">Min: {c.min_enrollment}</div>
                    <div className="badge-outline">Max: {c.max_enrollment}</div>
                    <div className="badge-outline">{c.credit_weight} Credits</div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showModal && (
            <Modal title={editing ? "Edit Repository Course" : "Add Course to Repository"} onClose={() => setShowModal(false)} maxWidth="500px">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <Input 
                    label="Course Name" 
                    required 
                    placeholder="e.g. Advanced Machine Learning"
                    value={formData.course_name}
                    onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                  />
                  <Input 
                    label="Subject Code" 
                    placeholder="e.g. CS401"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({...formData, subject_code: e.target.value})}
                  />
                </div>
                
                <textarea 
                  placeholder="Course description (optional)..." 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 12, border: '1px solid var(--border)', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input 
                    label="Min Enrolment" 
                    type="number"
                    value={formData.min_enrollment}
                    onChange={(e) => setFormData({...formData, min_enrollment: e.target.value})}
                  />
                  <Input 
                    label="Max Enrolment" 
                    type="number"
                    value={formData.max_enrollment}
                    onChange={(e) => setFormData({...formData, max_enrollment: e.target.value})}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input 
                    label="Classes" 
                    type="number"
                    value={formData.classes_per_course}
                    onChange={(e) => setFormData({...formData, classes_per_course: e.target.value})}
                  />
                  <Input 
                    label="Credits" 
                    type="number"
                    step="0.5"
                    value={formData.credit_weight}
                    onChange={(e) => setFormData({...formData, credit_weight: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <Button type="submit" variant="primary" style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 700 }}>{editing ? "Save Changes" : "Create Record"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)} style={{ height: 48, borderRadius: 12 }}>Cancel</Button>
                </div>
              </form>
            </Modal>
          )}

          <style>{`
            .course-card {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: var(--surface);
              border: 1px solid var(--border);
              position: relative;
              overflow: hidden;
            }
            .course-card:hover {
              transform: translateY(-8px);
              box-shadow: var(--shadow-lg);
              border-color: var(--accent-3);
            }
            .course-icon-box {
              width: 44px;
              height: 44px;
              background: var(--accent-gradient);
              color: white;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 0.9rem;
              text-transform: uppercase;
              box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            }
            .badge-outline {
              display: inline-block;
              padding: 4px 10px;
              border: 1px solid var(--border);
              border-radius: 20px;
              font-size: 0.72rem;
              font-weight: 600;
              color: var(--text-3);
              background: var(--bg-2);
            }
          `}</style>
          </>)}
        </div>
      </main>
    </div>
  );
}

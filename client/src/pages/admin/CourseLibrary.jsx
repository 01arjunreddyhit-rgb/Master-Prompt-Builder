import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Library, BookOpen, 
  Hash, Users, Layers, Star, Filter, Save, X 
} from 'lucide-react';
import { Button, Input, Card, Modal, Badge, LoadingScreen } from '../../components/ui/index';
import api from '../../services/api';

const CourseLibrary = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    course_name: '',
    subject_code: '',
    description: '',
    min_enrollment: 45,
    max_enrollment: 75,
    classes_per_course: 1,
    credit_weight: 3.0
  });

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses/library');
      if (res.data.success) setCourses(res.data.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const url = editingCourse 
      ? `/courses/library/${editingCourse.library_course_id}`
      : '/courses/library';
    const method = editingCourse ? 'put' : 'post';

    try {
      const res = await api[method](url, formData);
      if (res.data.success) {
        setIsModalOpen(false);
        setEditingCourse(null);
        fetchLibrary();
      }
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.message || 'Save failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this course from library?')) return;
    try {
      const res = await api.delete(`/courses/library/${id}`);
      if (res.data.success) fetchLibrary();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filtered = courses.filter(c => 
    c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject_code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen text="Loading Library..." />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Library className="w-8 h-8 text-indigo-600" />
            Master Course Library
          </h1>
          <p className="text-gray-500">Permanent repository of all academic courses</p>
        </div>
        <Button onClick={() => {
          setEditingCourse(null);
          setFormData({
            course_name: '', subject_code: '', description: '',
            min_enrollment: 45, max_enrollment: 75,
            classes_per_course: 1, credit_weight: 3.0
          });
          setIsModalOpen(true);
        }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add to Library
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search by course name or subject code..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(course => (
          <Card key={course.library_course_id} className="p-5 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3">
              <Badge variant="outline" className="text-xs font-mono">
                {course.subject_code || 'NO-CODE'}
              </Badge>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => {
                  setEditingCourse(course);
                  setFormData({ ...course });
                  setIsModalOpen(true);
                }} className="text-indigo-600 hover:text-indigo-800">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(course.library_course_id)} className="text-red-600 hover:text-red-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
              {course.course_name}
            </h3>
            
            <div className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
              {course.description || 'No description available.'}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>{course.credit_weight} Credits</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{course.min_enrollment}-{course.max_enrollment} Seats</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <Modal 
          title={editingCourse ? 'Edit Library Course' : 'Add to Library'} 
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Course Name</label>
                <Input 
                  required
                  value={formData.course_name}
                  onChange={e => setFormData({...formData, course_name: e.target.value})}
                  placeholder="e.g. Advanced Machine Learning"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subject Code</label>
                <Input 
                  value={formData.subject_code}
                  onChange={e => setFormData({...formData, subject_code: e.target.value})}
                  placeholder="e.g. CS401"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Credits</label>
                <Input 
                  type="number" step="0.5"
                  value={formData.credit_weight}
                  onChange={e => setFormData({...formData, credit_weight: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Min Enrollment</label>
                <Input 
                  type="number"
                  value={formData.min_enrollment}
                  onChange={e => setFormData({...formData, min_enrollment: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Enrollment</label>
                <Input 
                  type="number"
                  value={formData.max_enrollment}
                  onChange={e => setFormData({...formData, max_enrollment: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <textarea 
                className="w-full p-2 border rounded-lg h-24 text-sm font-sans"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Course overview and syllabus details..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {editingCourse ? 'Update Library' : 'Save to Library'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CourseLibrary;

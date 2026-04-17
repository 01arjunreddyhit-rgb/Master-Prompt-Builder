import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { LoadingScreen } from './components/ui/index';

// Public pages
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import JoinElection from './pages/JoinElection';

// Auth pages
import AdminLogin from './pages/auth/AdminLogin';
import StudentLogin from './pages/auth/StudentLogin';
import { AdminRegister, VerifyOTP } from './pages/auth/Register';
import StudentRegister from './pages/auth/StudentRegister';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminPending from './pages/admin/Pending';
import AdminCourses from './pages/admin/Courses';
import CourseLibrary from './pages/admin/CourseLibrary';
import AdminFaculty from './pages/admin/Faculty';
import ElectionControl from './pages/admin/ElectionControl';
import AllocationPanel from './pages/admin/AllocationPanel';
import AdminProfile from './pages/admin/Profile';
import CAVPanel from './pages/admin/CAVPanel';
import AdminResults from './pages/admin/Results';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentBookings from './pages/student/Bookings';
import StudentResults from './pages/student/Results';
import StudentProfile from './pages/student/Profile';
import StudentMessages from './pages/student/Messages';
import StudentParticipation from './pages/student/Participation';
import JoinViaCode from './pages/student/JoinViaCode';

// ── PROTECTED ROUTE WRAPPERS ──────────────────────────────────
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen text="Loading..." />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/student" replace />;
  return children;
};

const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen text="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to="/admin" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen text="Loading..." />;
  return children;
};

// ── APP ───────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Landing />} />

      {/* Public join link — anyone can view, login required to apply */}
      <Route path="/join/:code" element={<JoinElection />} />

      {/* Auth */}
      <Route path="/admin/login"      element={<PublicRoute><AdminLogin /></PublicRoute>} />
      <Route path="/admin/register"   element={<PublicRoute><AdminRegister /></PublicRoute>} />
      <Route path="/login"            element={<PublicRoute><StudentLogin /></PublicRoute>} />
      <Route path="/student/register" element={<PublicRoute><StudentRegister /></PublicRoute>} />
      <Route path="/verify-otp"       element={<PublicRoute><VerifyOTP /></PublicRoute>} />

      {/* Admin */}
      <Route path="/admin"            element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/students"   element={<AdminRoute><AdminStudents /></AdminRoute>} />
      <Route path="/admin/pending"    element={<AdminRoute><AdminPending /></AdminRoute>} />
      <Route path="/admin/courses"    element={<AdminRoute><AdminCourses /></AdminRoute>} />
      <Route path="/admin/library"    element={<AdminRoute><CourseLibrary /></AdminRoute>} />
      <Route path="/admin/faculty"    element={<AdminRoute><AdminFaculty /></AdminRoute>} />
      <Route path="/admin/election"   element={<AdminRoute><ElectionControl /></AdminRoute>} />
      <Route path="/admin/allocation" element={<AdminRoute><AllocationPanel /></AdminRoute>} />
      <Route path="/admin/results"    element={<AdminRoute><AdminResults /></AdminRoute>} />
      <Route path="/admin/profile"    element={<AdminRoute><AdminProfile /></AdminRoute>} />
      <Route path="/admin/cav"        element={<AdminRoute><CAVPanel /></AdminRoute>} />

      {/* Student */}
      <Route path="/student"              element={<StudentRoute><StudentDashboard /></StudentRoute>} />
      <Route path="/student/bookings"     element={<StudentRoute><StudentBookings /></StudentRoute>} />
      <Route path="/student/results"      element={<StudentRoute><StudentResults /></StudentRoute>} />
      <Route path="/student/profile"      element={<StudentRoute><StudentProfile /></StudentRoute>} />
      <Route path="/student/messages"     element={<StudentRoute><StudentMessages /></StudentRoute>} />
      <Route path="/student/join"          element={<StudentRoute><JoinViaCode /></StudentRoute>} />
      <Route path="/student/participation" element={<StudentRoute><StudentParticipation /></StudentRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

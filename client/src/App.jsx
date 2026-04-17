import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ElectionProvider } from './context/ElectionContext';
import { LoadingScreen } from './components/ui/index';

// ── LAZY LOADED PAGES ─────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing'));
const NotFound = lazy(() => import('./pages/NotFound'));
const JoinElection = lazy(() => import('./pages/JoinElection'));

// Auth
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));
const StudentLogin = lazy(() => import('./pages/auth/StudentLogin'));
const AdminRegister = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.AdminRegister })));
const VerifyOTP = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.VerifyOTP })));
const StudentRegister = lazy(() => import('./pages/auth/StudentRegister'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminStudents = lazy(() => import('./pages/admin/Students'));
const AdminPending = lazy(() => import('./pages/admin/Pending'));
const AdminCourses = lazy(() => import('./pages/admin/Courses'));
const CourseLibrary = lazy(() => import('./pages/admin/CourseLibrary'));
const AdminFaculty = lazy(() => import('./pages/admin/FacultyLibrary'));
const ElectionControl = lazy(() => import('./pages/admin/ElectionControl'));
const AllocationPanel = lazy(() => import('./pages/admin/AllocationPanel'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const CAVPanel = lazy(() => import('./pages/admin/CAVPanel'));
const AdminResults = lazy(() => import('./pages/admin/Results'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentBookings = lazy(() => import('./pages/student/Bookings'));
const StudentResults = lazy(() => import('./pages/student/Results'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));
const StudentMessages = lazy(() => import('./pages/student/Messages'));
const StudentParticipation = lazy(() => import('./pages/student/Participation'));
const JoinViaCode = lazy(() => import('./pages/student/JoinViaCode'));

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
    <Suspense fallback={<LoadingScreen text="Loading components..." />}>
      <Routes>
        <Route path="/" element={<Landing />} />
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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ElectionProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ElectionProvider>
    </AuthProvider>
  );
}

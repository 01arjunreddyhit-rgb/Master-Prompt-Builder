import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages — public
import Landing from './pages/Landing';
import AdminLogin from './pages/auth/AdminLogin';
import { AdminRegister, VerifyOTP } from './pages/auth/Register';
import StudentLogin from './pages/auth/StudentLogin';
import StudentRegister from './pages/auth/StudentRegister';
import JoinElection from './pages/JoinElection';
import NotFound from './pages/NotFound';

// Pages — admin (protected)
import AdminDashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import Pending from './pages/admin/Pending';
import Courses from './pages/admin/Courses';
import ElectionControl from './pages/admin/ElectionControl';
import CAVPanel from './pages/admin/CAVPanel';
import AllocationPanel from './pages/admin/AllocationPanel';
import AdminResults from './pages/admin/Results';
import AdminProfile from './pages/admin/Profile';

// Pages — student (protected)
import StudentDashboard from './pages/student/Dashboard';
import JoinViaCode from './pages/student/JoinViaCode';
import Bookings from './pages/student/Bookings';
import Participation from './pages/student/Participation';
import StudentResults from './pages/student/Results';
import Messages from './pages/student/Messages';
import StudentProfile from './pages/student/Profile';

/* ── Route guards ─────────────────────────────────────────────────── */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() as any;
  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() as any;
  if (loading) return null;
  if (!user || user.role !== 'student')
    return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />;
  return <>{children}</>;
}

/* ── Router ──────────────────────────────────────────────────────── */
function Router() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/login" element={<StudentLogin />} />
      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/join/:code" element={<JoinElection />} />

      {/* Admin protected */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/admin/students" element={<RequireAdmin><Students /></RequireAdmin>} />
      <Route path="/admin/pending" element={<RequireAdmin><Pending /></RequireAdmin>} />
      <Route path="/admin/courses" element={<RequireAdmin><Courses /></RequireAdmin>} />
      <Route path="/admin/election" element={<RequireAdmin><ElectionControl /></RequireAdmin>} />
      <Route path="/admin/cav" element={<RequireAdmin><CAVPanel /></RequireAdmin>} />
      <Route path="/admin/allocation" element={<RequireAdmin><AllocationPanel /></RequireAdmin>} />
      <Route path="/admin/results" element={<RequireAdmin><AdminResults /></RequireAdmin>} />
      <Route path="/admin/profile" element={<RequireAdmin><AdminProfile /></RequireAdmin>} />

      {/* Student protected */}
      <Route path="/student" element={<RequireStudent><StudentDashboard /></RequireStudent>} />
      <Route path="/student/join" element={<RequireStudent><JoinViaCode /></RequireStudent>} />
      <Route path="/student/bookings" element={<RequireStudent><Bookings /></RequireStudent>} />
      <Route path="/student/participation" element={<RequireStudent><Participation /></RequireStudent>} />
      <Route path="/student/results" element={<RequireStudent><StudentResults /></RequireStudent>} />
      <Route path="/student/messages" element={<RequireStudent><Messages /></RequireStudent>} />
      <Route path="/student/profile" element={<RequireStudent><StudentProfile /></RequireStudent>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/* ── App ─────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <Router />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

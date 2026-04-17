import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function NavItem({ icon, label, path, badge, navigate, location }) {
  const active = location.pathname === path || (path !== '/admin' && path !== '/student' && location.pathname.startsWith(path));
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(path)}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const nav = (p) => navigate(p);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">UC</div>
          <div className="logo-text">UCOS</div>
        </div>
        <div className="logo-sub">Admin Portal</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>
        <NavItem icon="◉" label="Dashboard"       path="/admin"            navigate={nav} location={location} />

        <div className="nav-section-label">Election</div>
        <NavItem icon="🗳" label="Election Control" path="/admin/election"   navigate={nav} location={location} />
        <NavItem icon="🔗" label="CAV Panel"        path="/admin/cav"        navigate={nav} location={location} />
        <NavItem icon="📚" label="Election Courses" path="/admin/courses"    navigate={nav} location={location} />
        
        <div className="nav-section-label">Global Repositories</div>
        <NavItem icon="🏛" label="Course Library"   path="/admin/library"    navigate={nav} location={location} />
        <NavItem icon="👨‍🏫" label="Faculty"          path="/admin/faculty"    navigate={nav} location={location} />
        <NavItem icon="📊" label="Allocation Panel" path="/admin/allocation" navigate={nav} location={location} />
        <NavItem icon="📋" label="Results"          path="/admin/results"    navigate={nav} location={location} />

        <div className="nav-section-label">Students</div>
        <NavItem icon="👥" label="Students"         path="/admin/students"   navigate={nav} location={location} />
        <NavItem icon="⏳" label="Pending"           path="/admin/pending"    navigate={nav} location={location} />

        <div className="nav-section-label">Account</div>
        <NavItem icon="👤" label="Profile"           path="/admin/profile"    navigate={nav} location={location} />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="su-name">{user?.admin_name || 'Admin'}</div>
          {user?.college_name && <div className="su-inst">{user.college_name}</div>}
          <div className="su-id">{user?.admin_id}</div>
        </div>
        <button className="nav-item" onClick={logout}
          style={{ width: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', borderRadius: 8, padding: '8px 12px' }}>
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

export function StudentSidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const nav = (p) => navigate(p);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/cav/messages')
      .then(r => setUnread(r.data.unread || 0))
      .catch(() => {});
    const iv = setInterval(() => {
      api.get('/cav/messages').then(r => setUnread(r.data.unread || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <aside className="sidebar" style={{ '--accent': 'var(--emerald)', '--accent-3': 'var(--emerald-2)' }}>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon" style={{ background: 'var(--emerald)' }}>UC</div>
          <div className="logo-text">UCOS</div>
        </div>
        <div className="logo-sub">Student Portal</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">My Election</div>
        <NavItem icon="◉" label="Dashboard"     path="/student"           navigate={nav} location={location} />
        <NavItem icon="🎫" label="My Bookings"   path="/student/bookings"  navigate={nav} location={location} />
        <NavItem icon="📊" label="My Results"    path="/student/results"   navigate={nav} location={location} />

        <div className="nav-section-label">Participation</div>
        <NavItem icon="🔗" label="Join Election" path="/student/join"      navigate={nav} location={location} />
        <NavItem icon="📬" label="Messages"      path="/student/messages"  navigate={nav} location={location} badge={unread > 0 ? unread : null} />

        <div className="nav-section-label">Account</div>
        <NavItem icon="👤" label="Profile"       path="/student/profile"   navigate={nav} location={location} />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="su-name">{user?.name || 'Student'}</div>
          <div className="su-id">{user?.full_student_id} · Sec {user?.section}</div>
        </div>
        <button className="nav-item" onClick={logout}
          style={{ width: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', borderRadius: 8, padding: '8px 12px' }}>
          <span>↩</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

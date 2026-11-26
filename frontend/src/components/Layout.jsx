import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Refresh unread count on navigation and every 30s
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get('/notifications/unread-count')
        .then((r) => active && setUnread(r.data.data.count))
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => navigate('/')}>
          <span className="logo">◆</span> Helpdesk
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/tickets">{isAdmin ? 'All Tickets' : 'My Tickets'}</NavLink>
          {!isAdmin && <NavLink to="/tickets/new">New Ticket</NavLink>}
          {isAdmin && <NavLink to="/admin/activity">Activity Log</NavLink>}
          <NavLink to="/notifications" className="notif-link">
            Notifications {unread > 0 && <span className="count">{unread}</span>}
          </NavLink>
        </nav>
        <div className="user-box">
          <span>
            {user.name} <small className={`role role-${user.role}`}>{user.role}</small>
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../utils/auth';
import { getSelectedExamType } from '../utils/examType';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const examType = getSelectedExamType();

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">ExamLMS</div>
        <nav className="topbar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/exams" className={({ isActive }) => (isActive ? 'active' : '')}>
            Exams
          </NavLink>
          <NavLink to="/learn" className={({ isActive }) => (isActive ? 'active' : '')}>
            Learn
          </NavLink>
          <NavLink to="/practice" className={({ isActive }) => (isActive ? 'active' : '')}>
            Practice
          </NavLink>
          <NavLink to="/study-plan" className={({ isActive }) => (isActive ? 'active' : '')}>
            Study Plan
          </NavLink>
          <NavLink to="/ai-assistant" className={({ isActive }) => (isActive ? 'active' : '')}>
            Ask AI
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="topbar-user">
          <ThemeToggle />
          {examType && (
            <NavLink to="/choose-exam" className="badge badge-neutral" title="Change exam">
              {examType}
            </NavLink>
          )}
          <span>{user?.fullName ?? user?.email ?? 'Student'}</span>
          {user?.role === 'admin' && <span className="badge badge-warning">Admin</span>}
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

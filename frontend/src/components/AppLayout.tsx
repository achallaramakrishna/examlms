import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../utils/auth';
import { clearSelectedExamType, examTypeLabel, getSelectedExamType } from '../utils/examType';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const examType = getSelectedExamType();

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearSelectedExamType();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          ExamLMS
          {examType && <span className="topbar-exam-pill">{examTypeLabel(examType)}</span>}
        </div>
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
          <NavLink to="/choose-exam" className="btn-outline topbar-switch-exam" title="Change exam track">
            Switch exam
          </NavLink>
          <span>{user?.fullName ?? user?.email ?? 'Student'}</span>
          {user?.role === 'admin' && <span className="badge badge-warning">Admin</span>}
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

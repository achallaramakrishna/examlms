import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ExamList } from './pages/ExamList';
import { Practice } from './pages/Practice';
import { MockTest } from './pages/MockTest';
import { StudyPlan } from './pages/StudyPlan';
import { AIAssistant } from './pages/AIAssistant';
import { AdminPanel } from './pages/AdminPanel';
import { ChooseExam, syncExamTypeFromProfile } from './pages/ChooseExam';
import { AppLayout } from './components/AppLayout';
import { isAdmin } from './utils/auth';
import { getSelectedExamType, clearSelectedExamType, isExamTypeAvailable } from './utils/examType';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  return isAdmin() ? children : <Navigate to="/dashboard" replace />;
}

/** Pick an available exam track before using Exams / Practice / etc. */
function RequireExamType({ children }: { children: JSX.Element }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'needs-selection'>('checking');

  useEffect(() => {
    const local = getSelectedExamType();
    if (local && isExamTypeAvailable(local)) {
      setStatus('ready');
      return;
    }
    if (local && !isExamTypeAvailable(local)) {
      clearSelectedExamType();
    }
    syncExamTypeFromProfile().then((type) => {
      if (type && isExamTypeAvailable(type)) {
        setStatus('ready');
      } else {
        if (type && !isExamTypeAvailable(type)) clearSelectedExamType();
        setStatus('needs-selection');
      }
    });
  }, []);

  if (status === 'checking') return <p className="loading-state">Loading...</p>;
  if (status === 'needs-selection') return <Navigate to="/choose-exam" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/choose-exam" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/choose-exam"
        element={
          <RequireAuth>
            <ChooseExam />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <RequireExamType>
              <AppLayout />
            </RequireExamType>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<div className="page"><Dashboard /></div>} />
        <Route path="/exams" element={<div className="page"><ExamList /></div>} />
        <Route path="/practice" element={<div className="page"><Practice /></div>} />
        <Route path="/mock-test/:examId" element={<div className="page"><MockTest /></div>} />
        <Route path="/study-plan" element={<div className="page"><StudyPlan /></div>} />
        <Route path="/ai-assistant" element={<div className="page"><AIAssistant /></div>} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <div className="page"><AdminPanel /></div>
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}

import { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Mode } from './api';
import { useAuth } from './AuthContext';
import AppLayout from './components/AppLayout';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Tasks from './pages/Tasks';
import TaskPage from './pages/TaskPage';
import Responders from './pages/Responders';
import Profile from './pages/Profile';

const HOME = '/home';

function Guest({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to={HOME} replace /> : <>{children}</>;
}

function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/welcome" replace />;
}

/** Screens that exist only for one mode. After switching mode in the profile we send the user to the matching screen. */
function ForMode({ mode, fallback, children }: { mode: Mode; fallback: string; children: ReactNode }) {
  const { user } = useAuth();
  return user?.mode === mode ? <>{children}</> : <Navigate to={fallback} replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen center hint">Загрузка…</div>;

  return (
    <Routes>
      <Route path="/welcome" element={<Guest><Welcome /></Guest>} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/new" element={<ForMode mode="REQUESTER" fallback={HOME}><NewOrder /></ForMode>} />
          <Route path="/orders" element={<ForMode mode="REQUESTER" fallback="/tasks"><Orders /></ForMode>} />
          <Route path="/tasks" element={<ForMode mode="RUNNER" fallback="/orders"><Tasks /></ForMode>} />
          <Route path="/task/:id" element={<TaskPage />} />
          <Route path="/task/:id/responders" element={<Responders />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? HOME : '/welcome'} replace />} />
    </Routes>
  );
}

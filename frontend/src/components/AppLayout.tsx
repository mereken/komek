import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/** Screen with the bottom tab bar. The middle tab depends on the mode: Заказы (requester) / Задания (runner). */
export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const runner = user?.mode === 'RUNNER';

  const home = pathname.startsWith('/home') || pathname === '/new';
  const profile = pathname.startsWith('/profile');
  const list = !home && !profile;

  return (
    <div className="screen tabs">
      <div className="screen-body">
        <Outlet />
      </div>
      <nav className="tabbar">
        <Link className={home ? 'active' : ''} to="/home">Главная</Link>
        <Link className={list ? 'active' : ''} to={runner ? '/tasks' : '/orders'}>{runner ? 'Задания' : 'Заказы'}</Link>
        <Link className={profile ? 'active' : ''} to="/profile">Профиль</Link>
      </nav>
    </div>
  );
}

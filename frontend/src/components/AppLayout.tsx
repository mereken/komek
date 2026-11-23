import { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { NotifProvider, useNotif } from '../NotifContext';

const svg = (children: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const ICON_HOME = svg(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>);
const ICON_LIST = svg(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M9 12h6M9 16h4" /></>);
const ICON_USER = svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>);

const badge = (n: number) => (n > 0 ? <span className="tab-badge" aria-label={`Новых: ${n}`}>{n > 9 ? '9+' : n}</span> : null);

/** Screen with the bottom tab bar. The middle tab depends on the mode: Заказы (requester) / Задания (runner). */
export default function AppLayout() {
  return (
    <NotifProvider>
      <Layout />
    </NotifProvider>
  );
}

function Layout() {
  const { user } = useAuth();
  const { summary } = useNotif();
  const { pathname } = useLocation();
  const runner = user?.mode === 'RUNNER';

  const home = pathname.startsWith('/home') || pathname === '/new' || pathname.startsWith('/notifications');
  const profile = pathname.startsWith('/profile') || pathname.startsWith('/wallet');
  const list = !home && !profile;

  return (
    <div className="screen tabs">
      <div className="screen-body">
        <Outlet />
      </div>
      <nav className="tabbar">
        <Link className={home ? 'active' : ''} to="/home">
          <span className="tab-ico">{ICON_HOME}</span>Главная
        </Link>
        <Link className={list ? 'active' : ''} to={runner ? '/tasks' : '/orders'}>
          <span className="tab-ico">{ICON_LIST}{badge(runner ? summary.tasks : summary.orders)}</span>{runner ? 'Задания' : 'Заказы'}
        </Link>
        <Link className={profile ? 'active' : ''} to="/profile">
          <span className="tab-ico">{ICON_USER}{badge(summary.profile)}</span>Профиль
        </Link>
      </nav>
    </div>
  );
}

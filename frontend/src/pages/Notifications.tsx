import { useNavigate } from 'react-router-dom';
import { api, AppNotification } from '../api';
import { shortDateTime } from '../format';
import { useLoad } from '../hooks';
import { useNotif } from '../NotifContext';
import BackButton from '../components/BackButton';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/Skeleton';

const ICON: Record<string, string> = {
  NEW_RESPONSE: '+', CHOSEN: '✓', NOT_CHOSEN: '•', PAID: '₸', STARTED: '▶', WORK_DONE: '!', CONFIRMED: '✓',
  RATED: '★', EDITED: '✎', CANCELLED: '✕', ADVANCE: '₸', PAYOUT: '₸', REFUND: '↩',
};

/** The list of news: new responses, payments, edits, ratings. Tapping one opens the order (or the wallet). */
export default function Notifications() {
  const nav = useNavigate();
  const { refresh } = useNotif();
  const { data, loading, error, reload } = useLoad<AppNotification[]>(() => api.notifications(), []);

  async function open(n: AppNotification) {
    if (!n.read) await api.notifRead(n.id).catch(() => {});
    refresh();
    if (n.area === 'PROFILE') nav('/wallet');
    else if (n.taskId) nav(`/task/${n.taskId}`);
    else reload();
  }

  async function readAll() {
    await api.notifReadAll().catch(() => {});
    refresh();
    reload();
  }

  const hasUnread = (data ?? []).some((n) => !n.read);

  return (
    <>
      <BackButton fallback="/home" />
      <div className="feed-head">
        <h1 className="title">Уведомления</h1>
        {hasUnread && <button type="button" className="pill" onClick={readAll}>Прочитать все</button>}
      </div>

      {error && <div className="err">{error}</div>}
      {loading && !data && <ListSkeleton />}
      {data && data.length === 0 && (
        <EmptyState title="Пока ничего нового" text="Здесь появятся отклики, оплаты, изменения заказов и оценки." />
      )}
      {data?.map((n) => (
        <button key={n.id} type="button" className={'notif' + (n.read ? '' : ' unread')} onClick={() => open(n)}>
          <span className="notif-ico">{ICON[n.kind] ?? '•'}</span>
          <span className="notif-main">
            <span className="notif-text">{n.text}</span>
            <small>{shortDateTime(n.createdAt)}</small>
          </span>
          {!n.read && <span className="fresh-dot" aria-label="Не прочитано" />}
        </button>
      ))}
    </>
  );
}

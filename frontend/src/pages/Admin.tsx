import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminStats, AdminTask, AdminUser, api, TaskStatus } from '../api';
import { useAuth } from '../AuthContext';
import Badge from '../components/Badge';
import { CATEGORIES, formatPhone, money } from '../format';
import { useLoad } from '../hooks';
import '../admin.css';

type Tab = 'stats' | 'users' | 'tasks';

const TABS: { value: Tab; label: string }[] = [
  { value: 'stats', label: 'Сводка' },
  { value: 'users', label: 'Пользователи' },
  { value: 'tasks', label: 'Заказы' },
];

const STATUS_ORDER: TaskStatus[] = ['OPEN', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

const STATUS: Record<TaskStatus, { text: string; tone: 'yellow' | 'orange' | 'green' | 'gray' }> = {
  OPEN: { text: 'Открыт', tone: 'yellow' },
  ACCEPTED: { text: 'Назначен', tone: 'orange' },
  IN_PROGRESS: { text: 'В работе', tone: 'orange' },
  DONE: { text: 'Выполнен', tone: 'green' },
  CANCELLED: { text: 'Отменён', tone: 'gray' },
};

const PAYMENT: Record<string, string> = { PAID: 'Резерв', RELEASED: 'Выплачено', REFUNDED: 'Возврат' };

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>Админ-панель</h1>
          <div className="adm-sub">{user?.fullName}</div>
        </div>
        <Link className="adm-back" to="/home">← В приложение</Link>
      </header>

      <nav className="adm-tabs">
        {TABS.map((t) => (
          <button key={t.value} type="button" className={t.value === tab ? 'on' : ''} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'stats' && <StatsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'tasks' && <TasksTab />}
    </div>
  );
}

// ---------------------------------------------------------------- dashboard

function StatsTab() {
  const { data, loading, error, reload } = useLoad<AdminStats>(() => api.adminStats(), []);

  if (error) {
    return (
      <>
        <div className="adm-err">{error}</div>
        <button type="button" className="adm-btn" onClick={reload}>Повторить</button>
      </>
    );
  }
  if (!data) return <div className="adm-hint">{loading ? 'Загрузка…' : ''}</div>;

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: 'Пользователей', value: String(data.users), hint: `+${data.newUsers7d} за 7 дней` },
    { label: 'Заказчики', value: String(data.requesters), hint: 'режим «Заказчик»' },
    { label: 'Исполнители', value: String(data.runners), hint: 'режим «Исполнитель»' },
    { label: 'Заказов', value: String(data.tasks), hint: `+${data.tasks7d} за 7 дней` },
    { label: 'Откликов', value: String(data.responses) },
    { label: 'Выполнено на сумму', value: money(data.doneReward) },
    { label: 'Комиссия платформы', value: money(data.commission), hint: 'с выплаченных заказов' },
    { label: 'Зарезервировано', value: money(data.held), hint: 'оплачено, ждёт подтверждения' },
    {
      label: 'Средняя оценка',
      value: data.avgRating == null ? '—' : `★ ${data.avgRating}`,
      hint: `оценок: ${data.ratingCount}`,
    },
  ];

  const maxDay = Math.max(1, ...data.days.map((d) => Math.max(d.users, d.tasks)));
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => data.tasksByStatus[s] ?? 0));

  return (
    <>
      <div className="adm-cards">
        {cards.map((c) => (
          <div className="adm-card" key={c.label}>
            <div className="adm-card-label">{c.label}</div>
            <div className="adm-card-value">{c.value}</div>
            {c.hint && <div className="adm-card-hint">{c.hint}</div>}
          </div>
        ))}
      </div>

      <h2 className="adm-h2">Заказы по статусам</h2>
      <div className="adm-statuses">
        {STATUS_ORDER.map((s) => {
          const n = data.tasksByStatus[s] ?? 0;
          return (
            <div className="adm-status-row" key={s}>
              <Badge {...STATUS[s]} />
              <div className="adm-track">
                <div className="adm-fill" style={{ width: `${(n / maxStatus) * 100}%` }} />
              </div>
              <b>{n}</b>
            </div>
          );
        })}
      </div>

      <h2 className="adm-h2">Последние 14 дней</h2>
      <div className="adm-legend">
        <span><i className="u" /> новые пользователи</span>
        <span><i className="t" /> новые заказы</span>
      </div>
      <div className="adm-chart">
        {data.days.map((d) => (
          <div className="adm-day" key={d.date} title={`${d.date}: пользователей ${d.users}, заказов ${d.tasks}`}>
            <div className="adm-bars">
              <div className="adm-bar u" style={{ height: `${(d.users / maxDay) * 100}%`, minHeight: d.users ? 3 : 0 }} />
              <div className="adm-bar t" style={{ height: `${(d.tasks / maxDay) * 100}%`, minHeight: d.tasks ? 3 : 0 }} />
            </div>
            <div className="adm-day-label">{d.date.slice(8)}</div>
          </div>
        ))}
      </div>

      <button type="button" className="adm-btn" onClick={reload}>Обновить</button>
    </>
  );
}

// -------------------------------------------------------------------- users

function UsersTab() {
  const { user: me } = useAuth();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');

  // search after a short pause in typing
  useEffect(() => {
    const t = setTimeout(() => setQuery(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data, loading, error, reload } = useLoad<AdminUser[]>(() => api.adminUsers(query), [query]);

  const remove = async (u: AdminUser) => {
    const ok = window.confirm(
      `Удалить пользователя «${u.fullName}»?\n\n` +
        'Вместе с ним удалятся его заказы, его отклики и задания, где он исполнитель. Это нельзя отменить.'
    );
    if (!ok) return;
    try {
      await api.adminDeleteUser(u.id);
      setMsg(`Пользователь «${u.fullName}» удалён`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <>
      <input
        className="adm-search"
        placeholder="Поиск по имени, телефону или e-mail"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {msg && <div className="adm-note">{msg}</div>}
      {error && <div className="adm-err">{error}</div>}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Контакт</th>
              <th>Режим</th>
              <th>Заказов</th>
              <th>Заданий</th>
              <th>Откликов</th>
              <th>Регистрация</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  {u.fullName} {u.admin && <span className="adm-tag">админ</span>}
                </td>
                <td>{u.phone ? formatPhone(u.phone) : u.email}</td>
                <td>{u.mode === 'RUNNER' ? 'Исполнитель' : 'Заказчик'}</td>
                <td>{u.tasksAsRequester}</td>
                <td>{u.tasksAsRunner}</td>
                <td>{u.responses}</td>
                <td>{dateTime(u.createdAt)}</td>
                <td className="adm-actions">
                  <button
                    type="button"
                    className="adm-btn danger"
                    disabled={u.admin || u.id === me?.id}
                    title={u.admin ? 'Администратора удалить нельзя' : undefined}
                    onClick={() => remove(u)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.length === 0 && <div className="adm-hint">Никого не найдено</div>}
      {loading && !data && <div className="adm-hint">Загрузка…</div>}
      {data && <div className="adm-hint">Всего в списке: {data.length}</div>}
    </>
  );
}

// -------------------------------------------------------------------- tasks

function TasksTab() {
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [msg, setMsg] = useState('');
  const { data, loading, error, reload } = useLoad<AdminTask[]>(() => api.adminTasks(status || undefined), [status]);

  const cancel = async (t: AdminTask) => {
    if (!window.confirm(`Отменить заказ №${t.id} «${t.title}»?`)) return;
    try {
      await api.adminCancelTask(t.id);
      setMsg(`Заказ №${t.id} отменён`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const remove = async (t: AdminTask) => {
    const ok = window.confirm(
      `Удалить заказ №${t.id} «${t.title}» вместе с откликами?\n\nЭто нельзя отменить.`
    );
    if (!ok) return;
    try {
      await api.adminDeleteTask(t.id);
      setMsg(`Заказ №${t.id} удалён`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <>
      <div className="adm-chips">
        <button type="button" className={status === '' ? 'on' : ''} onClick={() => setStatus('')}>Все</button>
        {STATUS_ORDER.map((s) => (
          <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
            {STATUS[s].text}
          </button>
        ))}
      </div>
      {msg && <div className="adm-note">{msg}</div>}
      {error && <div className="adm-err">{error}</div>}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Заказ</th>
              <th>Статус</th>
              <th>Цена</th>
              <th>Оплата</th>
              <th>Заказчик</th>
              <th>Исполнитель</th>
              <th>Откликов</th>
              <th>Создан</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => {
              const finished = t.status === 'DONE' || t.status === 'CANCELLED';
              return (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>
                    <b>{t.title}</b>
                    <div className="adm-meta">{categoryLabel(t.category)} · {t.location}</div>
                  </td>
                  <td><Badge {...STATUS[t.status]} /></td>
                  <td>{money(t.reward)}</td>
                  <td>{t.paymentStatus ? PAYMENT[t.paymentStatus] ?? t.paymentStatus : '—'}</td>
                  <td>{t.requesterName}</td>
                  <td>{t.runnerName ?? '—'}</td>
                  <td>{t.responses}</td>
                  <td>{dateTime(t.createdAt)}</td>
                  <td className="adm-actions">
                    {!finished && (
                      <button type="button" className="adm-btn" onClick={() => cancel(t)}>Отменить</button>
                    )}
                    <button type="button" className="adm-btn danger" onClick={() => remove(t)}>Удалить</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data && data.length === 0 && <div className="adm-hint">Заказов нет</div>}
      {loading && !data && <div className="adm-hint">Загрузка…</div>}
      {data && <div className="adm-hint">Показано: {data.length} (последние 300)</div>}
    </>
  );
}

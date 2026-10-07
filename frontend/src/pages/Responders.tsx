import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Offer, Task } from '../api';
import { money } from '../format';
import { useLoad } from '../hooks';
import BackButton from '../components/BackButton';

export default function Responders() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { data, loading, error } = useLoad<[Task, Offer[]]>(() => Promise.all([api.task(id), api.offers(id)]), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function choose(o: Offer) {
    setBusy(true);
    setActionError('');
    try {
      await api.selectOffer(id, o.id);
      nav(`/task/${id}`, { replace: true });
    } catch (e) {
      setActionError((e as Error).message);
      setBusy(false);
    }
  }

  if (loading && !data) return <div className="empty">Загрузка…</div>;
  if (!data) {
    return (
      <>
        <BackButton fallback="/orders" />
        <div className="err">{error}</div>
      </>
    );
  }
  const [task, offers] = data;

  return (
    <>
      <BackButton fallback={`/task/${id}`} />
      <h1 className="title">Выберите исполнителя</h1>
      <p className="sub">{task.title} · {money(task.reward)}</p>

      {task.status !== 'OPEN' && (
        <div className="note">Исполнитель уже выбран. <Link to={`/task/${id}`}>К заказу</Link></div>
      )}
      {offers.length === 0 && <div className="empty">Откликов пока нет.</div>}
      {actionError && <div className="err">{actionError}</div>}

      {offers.map((o) => (
        <div className="offer" key={o.id}>
          <div className="avatar">{o.runner.name.trim().charAt(0).toUpperCase()}</div>
          <div className="grow">
            <b>{o.runner.name}{o.runner.completed > 0 && <span className="check" title="Уже выполнял задания в Komek"> ✓</span>}</b>
            <div className="m">{o.runner.rating != null ? `★ ${o.runner.rating}` : 'Новичок'}</div>
          </div>
          <div className="offer-side">
            <span className="price">{money(o.price)}</span>
            <button className="btn" disabled={busy || task.status !== 'OPEN'} onClick={() => choose(o)}>Выбрать</button>
          </div>
        </div>
      ))}
    </>
  );
}

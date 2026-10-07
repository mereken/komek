import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Task } from '../api';
import { useAuth } from '../AuthContext';
import { money, taskBadge, whenText } from '../format';
import { useLoad } from '../hooks';
import BackButton from '../components/BackButton';
import Badge from '../components/Badge';
import ContactLink from '../components/ContactLink';
import InfoBox from '../components/InfoBox';
import MoneyInput from '../components/MoneyInput';
import PersonRow from '../components/PersonRow';

export default function TaskPage() {
  const id = Number(useParams().id);
  const { data, loading, error, setData } = useLoad(() => api.task(id), [id]);

  if (loading && !data) return <div className="empty">Загрузка…</div>;
  if (!data) {
    return (
      <>
        <BackButton />
        <div className="err">{error || 'Заказ не найден'}</div>
      </>
    );
  }
  return data.owner ? <OwnerView task={data} onChange={setData} /> : <RunnerView task={data} onChange={setData} />;
}

/** Runs an action, shows its error, and puts the updated task on screen. */
function useAction(onChange: (t: Task) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<Task>) => {
    setBusy(true);
    setError('');
    try {
      onChange(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

// ------------------------------------------------------------------ requester
function OwnerView({ task, onChange }: { task: Task; onChange: (t: Task) => void }) {
  const { busy, error, run } = useAction(onChange);
  const [stars, setStars] = useState(0);
  const st = task.status;

  const cancel = () => {
    if (window.confirm('Отменить заказ?')) run(() => api.cancel(task.id));
  };

  return (
    <>
      <BackButton fallback="/orders" />
      <h1 className="title">{task.title}</h1>
      <Badge {...taskBadge(task)} />
      <InfoBox task={task} />

      {task.description && (
        <>
          <div className="section strong">Что нужно сделать</div>
          <p className="text">{task.description}</p>
        </>
      )}

      {task.runner && st !== 'CANCELLED' && (
        <>
          <div className="section strong">Исполнитель</div>
          <PersonRow person={task.runner} showContact />
        </>
      )}

      {st === 'DONE' && (
        <div className="card">
          {task.rating ? (
            <b>Ваша оценка: {'★'.repeat(task.rating)}</b>
          ) : (
            <>
              <b>Как всё прошло?</b>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={n <= stars ? 'on' : ''} aria-label={`${n} из 5`} onClick={() => setStars(n)}>★</button>
                ))}
              </div>
              <button className="btn" disabled={busy || stars === 0} onClick={() => run(() => api.rate(task.id, stars))}>
                Оценить исполнителя
              </button>
            </>
          )}
        </div>
      )}

      {st === 'IN_PROGRESS' && <div className="note">Исполнитель уже выполняет заказ.</div>}
      {st === 'OPEN' && task.responseCount === 0 && (
        <div className="note">Пока нет откликов. Исполнители видят заказ в ленте, мы покажем отклики здесь.</div>
      )}

      {error && <div className="err">{error}</div>}

      <div className="actions">
        {st === 'OPEN' && task.responseCount > 0 && (
          <Link className="btn" to={`/task/${task.id}/responders`}>Посмотреть отклики ({task.responseCount})</Link>
        )}
        {(st === 'OPEN' || st === 'ACCEPTED') && (
          <button type="button" className="link danger" disabled={busy} onClick={cancel}>Отменить заказ</button>
        )}
      </div>
    </>
  );
}

// --------------------------------------------------------------------- runner
function RunnerView({ task, onChange }: { task: Task; onChange: (t: Task) => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { busy, error, run } = useAction(onChange);
  const [offering, setOffering] = useState(false);
  const [price, setPrice] = useState(String(task.reward));

  const st = task.status;
  const mine = task.runner?.id === user?.id; // the task is assigned to me
  const responded = task.myPrice != null;

  const withdraw = () => {
    if (window.confirm('Отозвать отклик?')) run(() => api.withdraw(task.id));
  };
  const complete = () => {
    if (window.confirm('Задание выполнено?')) run(() => api.complete(task.id));
  };

  return (
    <>
      <BackButton fallback="/home" />
      <h1 className="title">{task.title}</h1>
      <div className="bigprice">{money(task.reward)}</div>
      <div className="m">{whenText(task.deadline).replace(/^Сегодня /, '').toLowerCase()}</div>
      {mine && <div className="spaced-top"><Badge {...taskBadge(task)} /></div>}

      <InfoBox task={task} />

      {task.description && (
        <>
          <div className="section strong">Что нужно сделать</div>
          <p className="text">{task.description}</p>
        </>
      )}
      <p className="m">Заказчик: {task.requester.name}{task.requester.rating != null ? ` · ★ ${task.requester.rating}` : ''}</p>
      {mine && st !== 'CANCELLED' && <ContactLink contact={task.requester.contact} />}

      {mine && st === 'ACCEPTED' && <div className="note">Заказчик выбрал вас. Свяжитесь с ним и начните выполнение.</div>}
      {mine && st === 'DONE' && (
        <div className="note">Задание выполнено.{task.rating ? ` Оценка заказчика: ${'★'.repeat(task.rating)}` : ' Заказчик ещё не поставил оценку.'}</div>
      )}
      {mine && st === 'CANCELLED' && <div className="note">Заказчик отменил этот заказ.</div>}
      {!mine && st !== 'OPEN' && <div className="note">Этот заказ уже закрыт для откликов.</div>}
      {!mine && st === 'OPEN' && responded && (
        <div className="note">Отклик отправлен · {money(task.myPrice!)}. Заказчик выберет исполнителя, мы сообщим здесь.</div>
      )}

      {error && <div className="err">{error}</div>}

      <div className="actions">
        {/* not responded yet */}
        {!mine && st === 'OPEN' && !responded && !offering && (
          <button className="btn" onClick={() => setOffering(true)}>Откликнуться</button>
        )}
        {!mine && st === 'OPEN' && !responded && offering && (
          <>
            <div className="field tight">
              <label htmlFor="offer">Ваша цена</label>
              <MoneyInput id="offer" value={price} onChange={setPrice} />
              <span className="hint">Можно предложить свою цену. Заказчик увидит её в отклике.</span>
            </div>
            <button className="btn" disabled={busy || !price}
                    onClick={() => run(() => api.respond(task.id, Number(price)))}>
              {busy ? 'Отправляем…' : 'Отправить отклик'}
            </button>
            <button type="button" className="link center-link" onClick={() => setOffering(false)}>Отмена</button>
          </>
        )}
        {!mine && st === 'OPEN' && responded && (
          <button type="button" className="link danger" disabled={busy} onClick={withdraw}>Отозвать отклик</button>
        )}

        {/* assigned to me */}
        {mine && st === 'ACCEPTED' && (
          <button className="btn" disabled={busy} onClick={() => run(() => api.start(task.id))}>Начать выполнение</button>
        )}
        {mine && st === 'IN_PROGRESS' && (
          <button className="btn" disabled={busy} onClick={complete}>Завершить задание</button>
        )}
        {mine && (st === 'DONE' || st === 'CANCELLED') && (
          <button type="button" className="btn outline" onClick={() => nav('/tasks')}>К моим заданиям</button>
        )}
      </div>
    </>
  );
}

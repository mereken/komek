import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Task } from '../api';
import { useAuth } from '../AuthContext';
import { isPaid, money, taskBadge, whenText } from '../format';
import { useLoad } from '../hooks';
import BackButton from '../components/BackButton';
import Badge from '../components/Badge';
import InfoBox from '../components/InfoBox';
import MoneyInput from '../components/MoneyInput';
import PhoneGateModal from '../components/PhoneGateModal';
import StatusSteps from '../components/StatusSteps';
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

/** 1-5 stars + a button. Used for rating the other side after the order is done. */
function RatingCard({ title, button, busy, onSubmit }: {
  title: string;
  button: string;
  busy: boolean;
  onSubmit: (stars: number) => void;
}) {
  const [stars, setStars] = useState(0);
  return (
    <div className="card">
      <b>{title}</b>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= stars ? 'on' : ''} aria-label={`${n} из 5`} onClick={() => setStars(n)}>★</button>
        ))}
      </div>
      <button className="btn" disabled={busy || stars === 0} onClick={() => onSubmit(stars)}>{button}</button>
    </div>
  );
}

// ------------------------------------------------------------------ requester
function OwnerView({ task, onChange }: { task: Task; onChange: (t: Task) => void }) {
  const { busy, error, run } = useAction(onChange);
  const st = task.status;
  const paid = task.payment?.status === 'PAID';

  const cancel = () => {
    const text = paid
      ? 'Отменить заказ? Деньги вернутся на ваш баланс баллами.'
      : 'Отменить заказ?';
    if (window.confirm(text)) run(() => api.cancel(task.id));
  };
  const confirm = () => {
    if (window.confirm(`Подтвердить, что работа выполнена? Исполнителю будет переведено ${money(task.payout)}.`)) {
      run(() => api.confirm(task.id));
    }
  };

  return (
    <>
      <BackButton fallback="/orders" />
      <h1 className="title">{task.title}</h1>
      <Badge {...taskBadge(task)} />
      <StatusSteps task={task} />
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

      {/* payment */}
      {st === 'ACCEPTED' && !paid && (
        <div className="card pay-card">
          <b>Оплатите заказ</b>
          <p className="m">Деньги будут зарезервированы и уйдут исполнителю только после того, как вы подтвердите, что работа выполнена.</p>
          <Link className="btn" to={`/task/${task.id}/pay`}>Оплатить {money(task.reward)}</Link>
        </div>
      )}
      {st === 'ACCEPTED' && paid && (
        <div className="note ok">✓ Оплачено: {money(task.payment!.amount)} зарезервированы до подтверждения работы. Исполнитель может приступать.</div>
      )}
      {st === 'IN_PROGRESS' && !task.awaitingConfirmation && (
        <div className="note">Исполнитель выполняет заказ. Деньги ({money(task.payment?.amount ?? task.reward)}) зарезервированы.</div>
      )}
      {st === 'IN_PROGRESS' && task.awaitingConfirmation && (
        <div className="card pay-card">
          <b>Исполнитель сообщил, что работа выполнена</b>
          <p className="m">Проверьте результат. После подтверждения исполнитель получит {money(task.payout)}, комиссия сервиса {task.commissionPercent}% ({money(task.commission)}).</p>
          <button className="btn" disabled={busy} onClick={confirm}>Работа выполнена</button>
        </div>
      )}
      {st === 'DONE' && task.payment?.status === 'RELEASED' && (
        <div className="note ok">Заказ оплачен: {money(task.payment.amount)}. Исполнитель получил {money(task.payment.payout)}, комиссия сервиса {task.commissionPercent}%.</div>
      )}
      {st === 'CANCELLED' && task.payment?.status === 'REFUNDED' && (
        <div className="note">Заказ отменён. {money(task.payment.amount)} вернулись на ваш баланс — <Link to="/wallet">кошелёк</Link>.</div>
      )}

      {st === 'DONE' && (
        task.rating ? (
          <div className="card"><b>Ваша оценка исполнителю: {'★'.repeat(task.rating)}</b></div>
        ) : (
          <RatingCard title="Как всё прошло?" button="Оценить исполнителя" busy={busy}
                      onSubmit={(n) => run(() => api.rate(task.id, n))} />
        )
      )}
      {st === 'DONE' && task.requesterRating && (
        <div className="note">Исполнитель оценил вас: {'★'.repeat(task.requesterRating)}</div>
      )}

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
  const [gate, setGate] = useState(false); // "add your phone number" window
  const [price, setPrice] = useState(String(task.reward));

  const st = task.status;
  const mine = task.runner?.id === user?.id; // the task is assigned to me
  const responded = task.myPrice != null;
  const paid = isPaid(task);

  const withdraw = () => {
    if (window.confirm('Отозвать отклик?')) run(() => api.withdraw(task.id));
  };
  const complete = () => {
    if (window.confirm('Сообщить заказчику, что задание выполнено?')) run(() => api.complete(task.id));
  };

  // what I would get for the typed offer price
  const offerNum = Number(price) || 0;
  const offerPayout = offerNum - Math.round((offerNum * task.commissionPercent) / 100);

  return (
    <>
      <BackButton fallback="/home" />
      <h1 className="title">{task.title}</h1>
      <div className="bigprice">{money(task.reward)}</div>
      <div className="m">{whenText(task.deadline).replace(/^Сегодня /, '').toLowerCase()}</div>
      <div className="m">Вы получите {money(task.payout)} · комиссия сервиса {task.commissionPercent}% ({money(task.commission)})</div>
      {mine && <div className="spaced-top"><Badge {...taskBadge(task)} /></div>}
      {mine && <StatusSteps task={task} />}

      <InfoBox task={task} />

      {task.description && (
        <>
          <div className="section strong">Что нужно сделать</div>
          <p className="text">{task.description}</p>
        </>
      )}

      <div className="section strong">Заказчик</div>
      <PersonRow person={task.requester} showContact={mine && st !== 'CANCELLED'} newLabel="Новый заказчик" />

      {mine && st === 'ACCEPTED' && !paid && (
        <div className="note">Заказчик выбрал вас. Ждём оплату: после неё деньги будут зарезервированы, и вы сможете начать.</div>
      )}
      {mine && st === 'ACCEPTED' && paid && (
        <div className="note ok">✓ Оплата подтверждена: {money(task.payment!.amount)} зарезервированы. Свяжитесь с заказчиком и начинайте.</div>
      )}
      {mine && st === 'IN_PROGRESS' && task.awaitingConfirmation && (
        <div className="note">Вы сообщили о выполнении. Ждём подтверждения заказчика, после этого {money(task.payout)} поступят в ваш кошелёк.</div>
      )}
      {mine && st === 'DONE' && (
        <div className="note ok">
          Задание выполнено. На ваш баланс зачислено {money(task.payout)} (комиссия сервиса {task.commissionPercent}%). <Link to="/wallet">Кошелёк</Link>
          {task.rating ? ` Оценка заказчика: ${'★'.repeat(task.rating)}` : ' Заказчик ещё не поставил оценку.'}
        </div>
      )}
      {mine && st === 'DONE' && (
        task.requesterRating ? (
          <div className="card"><b>Ваша оценка заказчику: {'★'.repeat(task.requesterRating)}</b></div>
        ) : (
          <RatingCard title="Как вам заказчик?" button="Оценить заказчика" busy={busy}
                      onSubmit={(n) => run(() => api.rateRequester(task.id, n))} />
        )
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
          <button className="btn" onClick={() => (user?.phone ? setOffering(true) : setGate(true))}>Откликнуться</button>
        )}
        {!mine && st === 'OPEN' && !responded && offering && (
          <>
            <div className="field tight">
              <label htmlFor="offer">Ваша цена</label>
              <MoneyInput id="offer" value={price} onChange={setPrice} />
              <span className="hint">
                Можно предложить свою цену. Вы получите {money(Math.max(offerPayout, 0))} после комиссии сервиса {task.commissionPercent}%.
              </span>
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
          <button className="btn" disabled={busy || !paid} onClick={() => run(() => api.start(task.id))}>
            {paid ? 'Начать выполнение' : 'Начать можно после оплаты'}
          </button>
        )}
        {mine && st === 'IN_PROGRESS' && !task.awaitingConfirmation && (
          <button className="btn" disabled={busy} onClick={complete}>Сообщить о выполнении</button>
        )}
        {mine && (st === 'DONE' || st === 'CANCELLED') && (
          <button type="button" className="btn outline" onClick={() => nav('/tasks')}>К моим заданиям</button>
        )}
      </div>

      {gate && <PhoneGateModal onClose={() => setGate(false)} onDone={() => { setGate(false); setOffering(true); }} />}
    </>
  );
}

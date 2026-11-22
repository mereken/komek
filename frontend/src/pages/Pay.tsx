import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, PaymentMethod, Task, Wallet } from '../api';
import { money, pointsText } from '../format';
import { useLoad } from '../hooks';
import { cardErrors, formatCardNumber, formatExpiry } from '../validation';
import BackButton from '../components/BackButton';
import Segmented from '../components/Segmented';

/** Pay for an order. Demo bank: nothing real is charged. The money is reserved until the requester confirms the work. */
export default function Pay() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { data, loading, error } = useLoad<[Task, Wallet]>(() => Promise.all([api.task(id), api.wallet()]), [id]);

  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [newCard, setNewCard] = useState(false); // false = use the saved card (when there is one)
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [scenario, setScenario] = useState<'OK' | 'FAIL'>('OK');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading && !data) return <div className="empty">Загрузка…</div>;
  if (!data) {
    return (
      <>
        <BackButton fallback="/orders" />
        <div className="err">{error || 'Заказ не найден'}</div>
      </>
    );
  }
  const [task, wallet] = data;

  if (!task.owner || task.status !== 'ACCEPTED' || task.payment?.status === 'PAID') {
    return (
      <>
        <BackButton fallback={`/task/${id}`} />
        <h1 className="title">Оплата заказа</h1>
        <div className="note">
          {task.payment?.status === 'PAID'
            ? 'Этот заказ уже оплачен.'
            : 'Оплатить можно заказ, у которого выбран исполнитель и который ещё не начат.'}{' '}
          <Link to={`/task/${id}`}>К заказу</Link>
        </div>
      </>
    );
  }

  const saved = wallet.card;
  const useSaved = !!saved && !newCard;
  const enough = wallet.balance >= task.reward;

  async function submit() {
    setFormError('');
    if (method === 'BALANCE') {
      if (!enough) { setFormError('Недостаточно баллов. Пополните баланс в кошельке или оплатите картой.'); return; }
    } else if (useSaved) {
      if (!/^\d{3}$/.test(cvc)) { setFormError('CVC: 3 цифры'); return; }
    } else {
      const err = cardErrors(number, expiry, cvc);
      if (err) { setFormError(err); return; }
    }

    setBusy(true);
    try {
      const r = await api.pay(id, method === 'BALANCE'
        ? { method }
        : {
            method,
            useSavedCard: useSaved,
            cardNumber: useSaved ? undefined : number.replace(/\D/g, ''),
            expiry: useSaved ? undefined : expiry,
            cvc,
            saveCard: !useSaved && saveCard,
            simulateFail: wallet.testMode && scenario === 'FAIL',
          });
      if (r.ok) nav(`/task/${id}`, { replace: true });
      else setFormError(r.message);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackButton fallback={`/task/${id}`} />
      <h1 className="title">Оплата заказа</h1>
      <p className="sub">{task.title}</p>

      <div className="card pay-summary">
        <div className="m">К оплате</div>
        <div className="bigprice">{money(task.reward)}</div>
        <div className="pay-lines">
          <div><span>Исполнитель получит</span><b>{money(task.payout)}</b></div>
          <div><span>Комиссия сервиса {task.commissionPercent}%</span><b>{money(task.commission)}</b></div>
        </div>
        <p className="hint">Деньги резервируются и переводятся исполнителю только после того, как вы нажмёте «Работа выполнена».</p>
      </div>

      <div className="label">Способ оплаты</div>
      <Segmented<PaymentMethod>
        options={[{ value: 'CARD', label: 'Картой' }, { value: 'BALANCE', label: 'Баллами' }]}
        value={method}
        onChange={(m) => { setMethod(m); setFormError(''); }}
      />

      {method === 'BALANCE' && (
        <div className={'note' + (enough ? '' : ' warn')}>
          На балансе {pointsText(wallet.balance)}. {enough ? 'Хватает на оплату.' : 'Не хватает на оплату.'}{' '}
          {!enough && <Link to="/wallet">Пополнить</Link>}
        </div>
      )}

      {method === 'CARD' && (
        <>
          {saved && (
            <div className="paycards">
              <button type="button" className={!newCard ? 'on' : ''} onClick={() => setNewCard(false)}>
                <b>{saved.brand} •••• {saved.last4}</b>
                <span>Сохранённая карта · до {saved.expiry}</span>
              </button>
              <button type="button" className={newCard ? 'on' : ''} onClick={() => setNewCard(true)}>
                <b>Другая карта</b>
                <span>Ввести данные</span>
              </button>
            </div>
          )}

          {!useSaved && (
            <>
              <div className="field">
                <label htmlFor="num">Номер карты</label>
                <input id="num" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                       value={number} onChange={(e) => setNumber(formatCardNumber(e.target.value))} />
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="exp">Срок действия</label>
                  <input id="exp" inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ"
                         value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="cvc">CVC</label>
                  <input id="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" type="password" maxLength={3}
                         value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                </div>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} />
                Запомнить карту (сохраним только последние 4 цифры)
              </label>
            </>
          )}

          {useSaved && (
            <div className="field">
              <label htmlFor="cvc2">CVC</label>
              <input id="cvc2" inputMode="numeric" placeholder="123" type="password" maxLength={3}
                     value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </div>
          )}

          {wallet.testMode && (
            <div className="testbox">
              <b>Тестовый режим</b>
              <p>Реальные деньги не списываются. Подойдёт любая карта из 16 цифр, например 4242 4242 4242 4242. Выберите, как ответит «банк»:</p>
              <Segmented<'OK' | 'FAIL'>
                options={[{ value: 'OK', label: 'Платёж пройдёт' }, { value: 'FAIL', label: 'Банк откажет' }]}
                value={scenario}
                onChange={setScenario}
              />
            </div>
          )}
        </>
      )}

      {formError && <div className="err">{formError}</div>}

      <div className="actions">
        <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Оплачиваем…' : `Оплатить ${money(task.reward)}`}</button>
      </div>
    </>
  );
}

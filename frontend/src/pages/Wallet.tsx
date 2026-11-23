import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Tx, TxType, Wallet as WalletData } from '../api';
import { money, pointsText, shortDateTime } from '../format';
import { useLoad } from '../hooks';
import { cardErrors, formatCardNumber, formatExpiry } from '../validation';
import BackButton from '../components/BackButton';
import MoneyInput from '../components/MoneyInput';
import Segmented from '../components/Segmented';

type Panel = 'none' | 'topup' | 'withdraw' | 'card';

const TX_ICON: Record<TxType, string> = { TOPUP: '＋', PAYOUT: '₸', REFUND: '↩', PAYMENT: '−', WITHDRAWAL: '↑' };
const TX_TITLE: Record<TxType, string> = {
  TOPUP: 'Пополнение',
  PAYOUT: 'Оплата за заказ',
  REFUND: 'Возврат',
  PAYMENT: 'Оплата заказа',
  WITHDRAWAL: 'Вывод на карту',
};

/**
 * Wallet. Money for finished orders arrives as points (1 point = 1 tenge) after the requester confirms the work,
 * minus the platform commission. Points can pay for orders or be withdrawn to a card. The bank is simulated.
 */
export default function Wallet() {
  const { data, loading, error, setData } = useLoad<WalletData>(() => api.wallet(), []);
  const [panel, setPanel] = useState<Panel>('none');
  const [amount, setAmount] = useState('');
  const [scenario, setScenario] = useState<'OK' | 'FAIL'>('OK');
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [holder, setHolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  if (loading && !data) return <div className="empty">Загрузка…</div>;
  if (!data) {
    return (
      <>
        <BackButton fallback="/profile" />
        <div className="err">{error}</div>
      </>
    );
  }
  const w = data;

  function open(p: Panel) {
    setPanel(panel === p ? 'none' : p);
    setAmount('');
    setNum('');
    setExp('');
    setHolder('');
    setFormError('');
    setMsg('');
  }

  async function act(fn: () => Promise<WalletData>, done: string) {
    setBusy(true);
    setFormError('');
    setMsg('');
    try {
      setData(await fn());
      setMsg(done);
      setPanel('none');
      setAmount('');
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const amountNum = Number(amount);

  function submitTopUp() {
    if (amountNum < 100) { setFormError('Минимальная сумма — 100'); return; }
    act(() => api.topUp(amountNum, w.testMode && scenario === 'FAIL'), `Баланс пополнен на ${pointsText(amountNum)}`);
  }

  function submitWithdraw() {
    if (amountNum < 100) { setFormError('Минимальная сумма — 100'); return; }
    if (amountNum > w.balance) { setFormError('Недостаточно баллов на балансе'); return; }
    act(() => api.withdrawMoney(amountNum), `Вывод ${money(amountNum)} на карту •••• ${w.card?.last4} оформлен`);
  }

  function submitCard() {
    const err = cardErrors(num, exp, '123'); // the card is only linked here, so any CVC placeholder passes
    if (err) { setFormError(err); return; }
    act(() => api.saveCard({ cardNumber: num.replace(/\D/g, ''), expiry: exp, holder }), 'Карта привязана');
  }

  return (
    <>
      <BackButton fallback="/profile" />
      <h1 className="title">Кошелёк</h1>

      <div className="balance-card">
        <span className="k">Баланс</span>
        <b>{pointsText(w.balance)}</b>
        <span className="k">1 балл = 1 ₸ · заработано всего: {pointsText(w.earned)}</span>
        <div className="balance-actions">
          <button type="button" onClick={() => open('topup')}>Пополнить</button>
          <button type="button" onClick={() => open('withdraw')}>Вывести</button>
        </div>
      </div>

      {msg && <div className="note ok">{msg}</div>}

      {panel === 'topup' && (
        <div className="card">
          <b>Пополнить баланс</b>
          {!w.card ? (
            <p className="m">Сначала привяжите карту.</p>
          ) : (
            <>
              <p className="m">С карты {w.card.brand} •••• {w.card.last4}</p>
              <MoneyInput value={amount} onChange={setAmount} />
              <div className="quick">
                {[1000, 5000, 10000].map((n) => (
                  <button key={n} type="button" onClick={() => setAmount(String(n))}>{money(n)}</button>
                ))}
              </div>
              {w.testMode && (
                <div className="testbox">
                  <b>Тестовый режим</b>
                  <Segmented<'OK' | 'FAIL'>
                    options={[{ value: 'OK', label: 'Платёж пройдёт' }, { value: 'FAIL', label: 'Банк откажет' }]}
                    value={scenario}
                    onChange={setScenario}
                  />
                </div>
              )}
              {formError && <div className="err">{formError}</div>}
              <button className="btn" disabled={busy} onClick={submitTopUp}>{busy ? 'Пополняем…' : 'Пополнить'}</button>
            </>
          )}
          {!w.card && <button type="button" className="btn outline" onClick={() => open('card')}>Привязать карту</button>}
        </div>
      )}

      {panel === 'withdraw' && (
        <div className="card">
          <b>Вывести на карту</b>
          {!w.card ? (
            <>
              <p className="m">Сначала привяжите карту, на которую выводить.</p>
              <button type="button" className="btn outline" onClick={() => open('card')}>Привязать карту</button>
            </>
          ) : (
            <>
              <p className="m">На карту {w.card.brand} •••• {w.card.last4}. Доступно: {pointsText(w.balance)}</p>
              <MoneyInput value={amount} onChange={setAmount} />
              <div className="quick">
                <button type="button" onClick={() => setAmount(String(w.balance))}>Весь баланс</button>
              </div>
              {formError && <div className="err">{formError}</div>}
              <button className="btn" disabled={busy} onClick={submitWithdraw}>{busy ? 'Выводим…' : 'Вывести'}</button>
            </>
          )}
        </div>
      )}

      <div className="section strong">Банковская карта</div>
      {w.card ? (
        <div className="bankcard">
          <div className="bankcard-brand">{w.card.brand}</div>
          <div className="bankcard-num">•••• •••• •••• {w.card.last4}</div>
          <div className="bankcard-row"><span>{w.card.holder ?? 'Держатель карты'}</span><span>{w.card.expiry}</span></div>
          <div className="bankcard-actions">
            <button type="button" onClick={() => open('card')}>Заменить</button>
            <button type="button" onClick={() => { if (window.confirm('Удалить карту?')) act(() => api.removeCard(), 'Карта удалена'); }}>Удалить</button>
          </div>
        </div>
      ) : (
        panel !== 'card' && (
          <div className="card">
            <p className="m">Карта нужна, чтобы пополнять баланс и выводить заработанное.</p>
            <button type="button" className="btn outline" onClick={() => open('card')}>Привязать карту</button>
          </div>
        )
      )}

      {panel === 'card' && (
        <div className="card">
          <b>{w.card ? 'Новая карта' : 'Привязать карту'}</b>
          <div className="field">
            <label htmlFor="cnum">Номер карты</label>
            <input id="cnum" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                   value={num} onChange={(e) => setNum(formatCardNumber(e.target.value))} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="cexp">Срок действия</label>
              <input id="cexp" inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ"
                     value={exp} onChange={(e) => setExp(formatExpiry(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="chold">Имя на карте</label>
              <input id="chold" autoComplete="cc-name" placeholder="ADAM ALIEV" maxLength={60}
                     value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} />
            </div>
          </div>
          <p className="hint">Демо: подойдёт любая карта из 16 цифр, например 4242 4242 4242 4242. Мы сохраним только последние 4 цифры.</p>
          {formError && <div className="err">{formError}</div>}
          <button className="btn" disabled={busy} onClick={submitCard}>{busy ? 'Сохраняем…' : 'Сохранить карту'}</button>
        </div>
      )}

      <div className="section strong">Как это работает</div>
      <ul className="howto">
        <li>Заказчик оплачивает заказ, деньги резервируются и ждут.</li>
        <li>Когда заказчик подтверждает выполнение, исполнитель получает вознаграждение баллами.</li>
        <li>Сервис удерживает комиссию {w.commissionPercent}% только с вознаграждения.</li>
        <li>Если заказ требует покупки, аванс на расходы приходит, когда исполнитель начинает. Это деньги заказчика, а не заработок.</li>
        <li>Баллами можно оплачивать свои заказы или вывести их на карту.</li>
      </ul>

      <div className="section strong">История</div>
      {w.transactions.length === 0 && <div className="empty">Пока нет операций.</div>}
      {w.transactions.map((t: Tx) => (
        <div className="tx" key={t.id}>
          <div className={'tx-ico ' + (t.amount >= 0 ? 'pos' : 'neg')}>{TX_ICON[t.type]}</div>
          <div className="tx-main">
            <b>{t.advance ? 'Аванс на расходы' : TX_TITLE[t.type]}{t.advance && <span className="adv-tag">не доход</span>}</b>
            <div className="m">
              {t.note ?? ''}
              {t.taskId && <> · <Link to={`/task/${t.taskId}`}>заказ №{t.taskId}</Link></>}
            </div>
            <div className="m">{shortDateTime(t.createdAt)}</div>
          </div>
          <div className={'tx-sum ' + (t.amount >= 0 ? 'pos' : 'neg')}>
            {t.amount >= 0 ? '+' : '−'}{Math.abs(t.amount).toLocaleString('ru-RU')}
          </div>
        </div>
      ))}
    </>
  );
}

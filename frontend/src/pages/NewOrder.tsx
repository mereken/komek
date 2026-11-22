import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, Category } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES, PLACE_LABELS } from '../format';
import AddressInput from '../components/AddressInput';
import BackButton from '../components/BackButton';
import Dropdown from '../components/Dropdown';
import MoneyInput from '../components/MoneyInput';
import PhoneGateModal from '../components/PhoneGateModal';

/** The deadline must be at least this many minutes from now (the backend checks the same). */
const MIN_LEAD_MINUTES = 30;

/** "Now + minutes" in Almaty time, in the format a datetime-local input uses: 2026-11-22T14:35 */
function almatyLocal(plusMinutes = 0): string {
  const d = new Date(Date.now() + plusMinutes * 60000);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

type Errors = Partial<Record<'category' | 'from' | 'where' | 'when' | 'price', string>>;

export default function NewOrder() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const fromTile = CATEGORIES.find((c) => c.value === params.get('category'))?.value ?? '';
  const [gate, setGate] = useState(false); // the "add your phone number" window
  const [category, setCategory] = useState<Category | ''>(fromTile);
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const labels = category ? PLACE_LABELS[category] : null;
  const earliest = almatyLocal(MIN_LEAD_MINUTES);

  function validate(): Errors {
    const e: Errors = {};
    if (!category) e.category = 'Выберите, что нужно сделать';
    if (labels?.from && !from.trim()) e.from = 'Укажите адрес';
    if (!location.trim()) e.where = 'Укажите адрес';
    if (!deadline) e.when = 'Укажите дату и время';
    else if (deadline < almatyLocal(MIN_LEAD_MINUTES)) {
      e.when = `Выберите время не раньше чем через ${MIN_LEAD_MINUTES} минут`;
    }
    if (!price || Number(price) < 100) e.price = 'Минимальная цена — 100 ₸';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!user?.phone) { setGate(true); return; }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    try {
      await api.createTask({
        category: category || null,
        title,
        fromLocation: labels?.from ? from.trim() : null,
        location: location.trim(),
        deadline,
        description,
        reward: Number(price),
      });
      nav('/orders', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="page-form">
      <BackButton fallback="/home" />
      <h1 className="title">Новый заказ</h1>

      {!user?.phone && (
        <div className="note warn">
          Чтобы исполнитель мог с вами связаться, добавьте номер телефона.{' '}
          <button type="button" className="link" onClick={() => setGate(true)}>Добавить номер</button>
        </div>
      )}

      <div className="field">
        <label htmlFor="cat">Что нужно сделать</label>
        <Dropdown id="cat" value={category} options={CATEGORIES} placeholder="Выберите" onChange={(c) => { setCategory(c); setErrors((x) => ({ ...x, category: undefined })); }} />
        {errors.category && <div className="err">{errors.category}</div>}
      </div>

      <div className="field">
        <label htmlFor="title">Название <span className="muted-inline">(необязательно)</span></label>
        <input id="title" maxLength={120} placeholder="Например, купить лекарства" value={title}
               onChange={(e) => setTitle(e.target.value)} />
      </div>

      {labels?.from && (
        <div className="field">
          <label htmlFor="from">{labels.from.label}</label>
          <AddressInput id="from" value={from} onChange={setFrom} placeholder={labels.from.placeholder} invalid={!!errors.from} />
          {errors.from && <div className="err">{errors.from}</div>}
        </div>
      )}

      <div className="field">
        <label htmlFor="where">{labels ? labels.to.label : 'Адрес'}</label>
        <AddressInput id="where" value={location} onChange={setLocation}
                      placeholder={labels ? labels.to.placeholder : 'Начните вводить адрес или название места'}
                      invalid={!!errors.where} />
        {errors.where && <div className="err">{errors.where}</div>}
      </div>

      <div className="field">
        <label htmlFor="when">Когда (выполнить до)</label>
        <input id="when" type="datetime-local" min={earliest} value={deadline}
               className={errors.when ? 'invalid' : ''} onChange={(e) => setDeadline(e.target.value)} />
        <span className="hint">Не раньше чем через {MIN_LEAD_MINUTES} минут от текущего времени.</span>
        {errors.when && <div className="err">{errors.when}</div>}
      </div>

      <div className="field">
        <label htmlFor="comment">Комментарий к заказу</label>
        <textarea id="comment" rows={3} maxLength={2000} placeholder="Комментарий" value={description}
                  onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="price">Цена</label>
        <MoneyInput id="price" value={price} onChange={setPrice} />
        {errors.price && <div className="err">{errors.price}</div>}
        <span className="hint">Деньги спишутся только после того, как вы выберете исполнителя и оплатите заказ. Исполнитель получит их после вашего подтверждения.</span>
      </div>

      {error && <div className="err">{error}</div>}

      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'Публикуем…' : 'Опубликовать'}</button>
      </div>
      {gate && <PhoneGateModal onClose={() => setGate(false)} onDone={() => setGate(false)} />}
    </form>
  );
}

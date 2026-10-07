import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Category } from '../api';
import { CATEGORIES } from '../format';
import BackButton from '../components/BackButton';
import Dropdown from '../components/Dropdown';
import MoneyInput from '../components/MoneyInput';

const pad = (n: number) => String(n).padStart(2, '0');

/** Current local time in the format datetime-local expects, so past times can't be picked. */
function nowLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewOrder() {
  const nav = useNavigate();
  const [category, setCategory] = useState<Category | ''>('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createTask({
        category: category || null,
        title,
        location,
        deadline: deadline || null,
        description,
        reward: price ? Number(price) : null,
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

      <div className="field">
        <label htmlFor="cat">Что нужно сделать</label>
        <Dropdown id="cat" value={category} options={CATEGORIES} placeholder="Поручение" onChange={setCategory} />
      </div>

      <div className="field">
        <label htmlFor="title">Название <span className="muted-inline">(необязательно)</span></label>
        <input id="title" maxLength={120} placeholder="Например, купить лекарства" value={title}
               onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="where">Где</label>
        <input id="where" maxLength={200} placeholder="Адрес" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="when">Когда (выполнить до)</label>
        <input id="when" type="datetime-local" min={nowLocal()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="comment">Комментарий к заказу</label>
        <textarea id="comment" rows={3} maxLength={2000} placeholder="Комментарий" value={description}
                  onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="price">Цена</label>
        <MoneyInput id="price" value={price} onChange={setPrice} />
      </div>

      {error && <div className="err">{error}</div>}

      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'Публикуем…' : 'Опубликовать'}</button>
      </div>
    </form>
  );
}

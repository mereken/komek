import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, Category, NewTask, Task } from '../api';
import { useAuth } from '../AuthContext';
import { AddrDetails, CATEGORIES, CATEGORY_CONFIG, parseDetails, stringifyDetails } from '../format';
import AddressInput from '../components/AddressInput';
import BackButton from '../components/BackButton';
import DetailsFields from '../components/DetailsFields';
import Dropdown from '../components/Dropdown';
import MoneyInput from '../components/MoneyInput';
import PhoneGateModal from '../components/PhoneGateModal';
import Segmented from '../components/Segmented';
import Switch from '../components/Switch';

/** The deadline (or the start of a window) must be at least this many minutes from now; the backend checks the same. */
const MIN_LEAD_MINUTES = 30;
const MIN_WINDOW_MINUTES = 15;
const ANY_SHOP = 'Любой ближайший магазин';

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

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

type When = 'BY' | 'WINDOW';
type Errors = Partial<Record<'category' | 'from' | 'where' | 'when' | 'price' | 'budget', string>>;

/**
 * One form for three things: a new order, an edited order (?edit=ID, only while no runner is chosen)
 * and a repeated order (?repeat=ID: the same details, the time moves to tomorrow).
 */
export default function NewOrder() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const editId = Number(params.get('edit')) || null;
  const repeatId = Number(params.get('repeat')) || null;
  const sourceId = editId ?? repeatId;
  const fromTile = CATEGORIES.find((c) => c.value === params.get('category'))?.value ?? '';

  const [gate, setGate] = useState(false); // the "add your phone number" window
  const [loadingTask, setLoadingTask] = useState(!!sourceId);
  const [loadError, setLoadError] = useState('');

  const [category, setCategory] = useState<Category | ''>(fromTile);
  const [title, setTitle] = useState('');
  const [twoAddr, setTwoAddr] = useState(false); // optional second address (queue, dog walk, other)
  const [anyShop, setAnyShop] = useState(false);
  const [from, setFrom] = useState('');
  const [fromD, setFromD] = useState<AddrDetails>({});
  const [location, setLocation] = useState('');
  const [locD, setLocD] = useState<AddrDetails>({});
  const [whenMode, setWhenMode] = useState<When>('BY');
  const [deadline, setDeadline] = useState('');
  const [winDate, setWinDate] = useState('');
  const [winFrom, setWinFrom] = useState('');
  const [winTo, setWinTo] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [offers, setOffers] = useState(true);
  const [needBudget, setNeedBudget] = useState(false);
  const [budget, setBudget] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editBlocked, setEditBlocked] = useState(false);

  // ---- load the source order for "edit" / "repeat"
  useEffect(() => {
    if (!sourceId) return;
    api.task(sourceId)
      .then((t) => {
        if (editId && (!t.owner || t.status !== 'OPEN')) { setEditBlocked(true); return; }
        prefill(t, !!repeatId);
      })
      .catch((e) => setLoadError((e as Error).message))
      .finally(() => setLoadingTask(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  function prefill(t: Task, moveToTomorrow: boolean) {
    setCategory(t.category);
    setTitle(t.title);
    setDescription(t.description);
    setPrice(String(t.reward));
    setOffers(t.allowOffers);
    setNeedBudget(t.budget > 0);
    setBudget(t.budget > 0 ? String(t.budget) : '');
    if (t.fromLocation) {
      setTwoAddr(true);
      if (t.fromLocation === ANY_SHOP) setAnyShop(true);
      else setFrom(t.fromLocation);
      setFromD(parseDetails(t.fromDetails));
    }
    setLocation(t.location);
    setLocD(parseDetails(t.locationDetails));
    const day = moveToTomorrow ? almatyLocal(24 * 60).slice(0, 10) : null;
    if (t.startAt) {
      setWhenMode('WINDOW');
      setWinDate(day ?? t.startAt.slice(0, 10));
      setWinFrom(t.startAt.slice(11, 16));
      setWinTo(t.deadline.slice(11, 16));
    } else {
      setWhenMode('BY');
      setDeadline(`${day ?? t.deadline.slice(0, 10)}T${t.deadline.slice(11, 16)}`);
    }
  }

  const cfg = category ? CATEGORY_CONFIG[category] : null;
  const twoActive = !!cfg && (cfg.twoRequired || twoAddr);
  const budgetActive = !!cfg && (cfg.budget === 'required' || (cfg.budget === 'optional' && needBudget));

  function onCategory(c: Category) {
    setCategory(c);
    setErrors((x) => ({ ...x, category: undefined }));
    if (!sourceId) setWhenMode(c === 'DOG_WALK' ? 'WINDOW' : 'BY'); // a dog walk is usually "from 19 to 20"
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!category) e.category = 'Выберите, что нужно сделать';
    if (twoActive && !anyShop && !from.trim()) e.from = 'Укажите адрес';
    if (!location.trim()) e.where = 'Укажите адрес';

    if (whenMode === 'BY') {
      if (!deadline) e.when = 'Укажите дату и время';
      else if (deadline < almatyLocal(MIN_LEAD_MINUTES)) e.when = `Выберите время не раньше чем через ${MIN_LEAD_MINUTES} минут`;
    } else if (!winDate || !winFrom || !winTo) {
      e.when = 'Укажите дату и время начала и конца';
    } else if (`${winDate}T${winFrom}` < almatyLocal(MIN_LEAD_MINUTES)) {
      e.when = `Начало — не раньше чем через ${MIN_LEAD_MINUTES} минут`;
    } else if (toMinutes(winTo) - toMinutes(winFrom) < MIN_WINDOW_MINUTES) {
      e.when = `Конец должен быть позже начала минимум на ${MIN_WINDOW_MINUTES} минут`;
    }

    if (!price || Number(price) < 100) e.price = 'Минимальная цена — 100 ₸';
    if (budgetActive && (!budget || Number(budget) < 100)) e.budget = 'Укажите сумму от 100 ₸';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!user?.phone) { setGate(true); return; }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const isWindow = whenMode === 'WINDOW';
    const body: NewTask = {
      category: category || null,
      title,
      fromLocation: twoActive ? (anyShop ? ANY_SHOP : from.trim()) : null,
      fromDetails: twoActive && !anyShop ? stringifyDetails(fromD) : null,
      location: location.trim(),
      locationDetails: stringifyDetails(locD),
      startAt: isWindow ? `${winDate}T${winFrom}` : null,
      deadline: isWindow ? `${winDate}T${winTo}` : deadline,
      description,
      reward: Number(price),
      budget: budgetActive ? Number(budget) : 0,
      allowOffers: offers,
    };

    setBusy(true);
    try {
      if (editId) {
        await api.updateTask(editId, body);
        nav(`/task/${editId}`, { replace: true });
      } else {
        await api.createTask(body);
        nav('/orders', { replace: true });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadingTask) return <div className="empty">Загрузка…</div>;
  if (loadError) return <><BackButton fallback="/orders" /><div className="err">{loadError}</div></>;
  if (editBlocked) {
    return (
      <>
        <BackButton fallback="/orders" />
        <h1 className="title">Изменить заказ</h1>
        <div className="note">Изменить заказ можно, пока не выбран исполнитель. <Link to={`/task/${editId}`}>К заказу</Link></div>
      </>
    );
  }

  const todayStr = almatyLocal(0).slice(0, 10);

  return (
    <form onSubmit={onSubmit} noValidate className="page-form">
      <BackButton fallback={editId ? `/task/${editId}` : '/home'} />
      <h1 className="title">{editId ? 'Изменить заказ' : repeatId ? 'Повторить заказ' : 'Новый заказ'}</h1>

      {editId && <div className="note">Исполнители, которые уже откликнулись, увидят пометку «Заказ изменён» и список изменений.</div>}
      {repeatId && <div className="note">Заказ скопирован. Время сдвинуто на завтра, поменяйте то, что нужно.</div>}
      {!user?.phone && (
        <div className="note warn">
          Чтобы исполнитель мог с вами связаться, добавьте номер телефона.{' '}
          <button type="button" className="link" onClick={() => setGate(true)}>Добавить номер</button>
        </div>
      )}

      <div className="field">
        <label htmlFor="cat">Что нужно сделать</label>
        <Dropdown id="cat" value={category} options={CATEGORIES} placeholder="Выберите" onChange={onCategory} />
        {errors.category && <div className="err">{errors.category}</div>}
      </div>

      <div className="field">
        <label htmlFor="title">Название <span className="muted-inline">(необязательно)</span></label>
        <input id="title" maxLength={120} placeholder="Например, купить лекарства" value={title}
               onChange={(e) => setTitle(e.target.value)} />
      </div>

      {/* ---- addresses */}
      {cfg && !cfg.twoRequired && cfg.toggleLabel && (
        <Switch checked={twoAddr} onChange={setTwoAddr} label={cfg.toggleLabel} />
      )}

      {twoActive && (
        <div className="field">
          <label htmlFor="from">{cfg!.from.label}</label>
          {cfg!.anyShop && (
            <label className="check-row">
              <input type="checkbox" checked={anyShop} onChange={(e) => setAnyShop(e.target.checked)} />
              Подойдёт любой ближайший магазин
            </label>
          )}
          {!anyShop && (
            <>
              <AddressInput id="from" value={from} onChange={setFrom} placeholder={cfg!.from.placeholder} invalid={!!errors.from} />
              {errors.from && <div className="err">{errors.from}</div>}
              <DetailsFields value={fromD} onChange={setFromD} />
            </>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="where">{cfg ? (twoActive ? cfg.to.label : cfg.one.label) : 'Адрес'}</label>
        <AddressInput id="where" value={location} onChange={setLocation}
                      placeholder={cfg ? (twoActive ? cfg.to.placeholder : cfg.one.placeholder) : 'Начните вводить адрес или название места'}
                      invalid={!!errors.where} />
        {errors.where && <div className="err">{errors.where}</div>}
        <DetailsFields value={locD} onChange={setLocD} />
      </div>

      {/* ---- time */}
      <div className="field">
        <label>Когда</label>
        <Segmented<When>
          options={[{ value: 'BY', label: 'Выполнить до' }, { value: 'WINDOW', label: 'В промежутке' }]}
          value={whenMode}
          onChange={(m) => { setWhenMode(m); setErrors((x) => ({ ...x, when: undefined })); }}
        />
        {whenMode === 'BY' ? (
          <input id="when" type="datetime-local" min={almatyLocal(MIN_LEAD_MINUTES)} value={deadline}
                 className={errors.when ? 'invalid' : ''} onChange={(e) => setDeadline(e.target.value)} />
        ) : (
          <div className="when-window">
            <input type="date" aria-label="Дата" min={todayStr} value={winDate}
                   className={errors.when ? 'invalid' : ''} onChange={(e) => setWinDate(e.target.value)} />
            <div className="row2">
              <label className="mini-label">С
                <input type="time" value={winFrom} className={errors.when ? 'invalid' : ''} onChange={(e) => setWinFrom(e.target.value)} />
              </label>
              <label className="mini-label">До
                <input type="time" value={winTo} className={errors.when ? 'invalid' : ''} onChange={(e) => setWinTo(e.target.value)} />
              </label>
            </div>
          </div>
        )}
        <span className="hint">
          {whenMode === 'BY'
            ? `Не раньше чем через ${MIN_LEAD_MINUTES} минут от текущего времени.`
            : `Исполнитель выполнит заказ именно в этот промежуток. Начало не раньше чем через ${MIN_LEAD_MINUTES} минут.`}
        </span>
        {errors.when && <div className="err">{errors.when}</div>}
      </div>

      {/* ---- comment */}
      <div className="field">
        <label htmlFor="comment">{cfg ? cfg.desc.label : 'Комментарий к заказу'}</label>
        <textarea id="comment" rows={3} maxLength={2000} placeholder={cfg ? cfg.desc.placeholder : 'Комментарий'}
                  value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* ---- money */}
      <div className="field">
        <label htmlFor="price">Вознаграждение исполнителю</label>
        <MoneyInput id="price" value={price} onChange={setPrice} />
        {errors.price && <div className="err">{errors.price}</div>}
      </div>
      <Switch
        checked={offers}
        onChange={setOffers}
        label="Исполнитель может предложить свою цену"
        hint={offers ? 'Вы выберете исполнителя по цене и рейтингу.' : 'Цена фиксированная: исполнители откликаются только за эту сумму.'}
      />

      {cfg && cfg.budget === 'optional' && (
        <Switch checked={needBudget} onChange={setNeedBudget} label="Исполнителю нужно потратить свои деньги"
                hint="Покупка, оплата при получении, сбор" />
      )}
      {budgetActive && (
        <div className="field">
          <label htmlFor="budget">{cfg!.budget === 'required' ? 'Деньги на покупку (максимум)' : 'Деньги на расходы (максимум)'}</label>
          <MoneyInput id="budget" value={budget} onChange={setBudget} />
          {errors.budget && <div className="err">{errors.budget}</div>}
          <span className="hint">
            Вы оплачиваете эту сумму вместе с вознаграждением. Исполнитель получит её авансом, когда начнёт, и это не его заработок.
            Остаток или нехватку вы решите с ним по телефону.
          </span>
        </div>
      )}

      <p className="hint">
        Деньги спишутся, когда вы выберете исполнителя и оплатите заказ. Вознаграждение уйдёт исполнителю только после вашего подтверждения.
      </p>

      {error && <div className="err">{error}</div>}

      <div className="actions">
        <button className="btn" disabled={busy}>
          {busy ? 'Сохраняем…' : editId ? 'Сохранить изменения' : 'Опубликовать'}
        </button>
      </div>

      {gate && <PhoneGateModal onClose={() => setGate(false)} onDone={() => setGate(false)} />}
    </form>
  );
}

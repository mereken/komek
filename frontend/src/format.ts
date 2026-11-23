import type { Category, Task, WorkItem } from './api';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'PICKUP', label: 'Забрать заказ' },
  { value: 'QUEUE', label: 'Очередь' },
  { value: 'BUY', label: 'Купить товар' },
  { value: 'DOG_WALK', label: 'Выгулять собаку' },
  { value: 'OTHER', label: 'Другое' },
];

interface Field { label: string; placeholder: string }

/** What the order form asks for in each category. */
export interface CategoryConfig {
  twoRequired: boolean; // always two addresses ("from" and "to")
  toggleLabel?: string; // otherwise a switch adds the second address
  one: Field; // the only address
  from: Field; // first of two
  to: Field; // second of two
  desc: Field; // the comment field
  budget: 'required' | 'optional' | 'none'; // money the runner has to spend
  anyShop?: boolean; // "any nearest shop" checkbox for the first address
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  PICKUP: {
    twoRequired: true,
    one: { label: 'Адрес', placeholder: 'Адрес' },
    from: { label: 'Откуда забрать', placeholder: 'Пункт выдачи, магазин или адрес' },
    to: { label: 'Куда доставить (где оставить)', placeholder: 'Адрес, куда привезти' },
    desc: { label: 'Что забрать', placeholder: 'Номер заказа, на чьё имя, как выглядит посылка' },
    budget: 'optional',
  },
  BUY: {
    twoRequired: true,
    one: { label: 'Адрес', placeholder: 'Адрес' },
    from: { label: 'Где купить', placeholder: 'Магазин, торговый центр, аптека' },
    to: { label: 'Куда привезти (где оставить)', placeholder: 'Адрес, куда привезти' },
    desc: { label: 'Что купить', placeholder: 'Список: что, сколько, какой бренд; что делать, если нет в наличии' },
    budget: 'required',
    anyShop: true,
  },
  QUEUE: {
    twoRequired: false,
    toggleLabel: 'Передать результат в другое место',
    one: { label: 'Где нужно постоять', placeholder: 'Адрес, например «Центр обслуживания»' },
    from: { label: 'Где нужно постоять', placeholder: 'Адрес' },
    to: { label: 'Куда передать результат', placeholder: 'Адрес, куда принести документы или талон' },
    desc: { label: 'Что нужно сделать в очереди', placeholder: 'Куда и зачем, какой талон или документ получить' },
    budget: 'optional',
  },
  DOG_WALK: {
    twoRequired: false,
    toggleLabel: 'Вернуть собаку в другое место',
    one: { label: 'Где забрать собаку', placeholder: 'Адрес (собаку вернут сюда же)' },
    from: { label: 'Где забрать собаку', placeholder: 'Адрес' },
    to: { label: 'Где вернуть собаку', placeholder: 'Адрес' },
    desc: { label: 'О собаке', placeholder: 'Кличка, порода, размер, как гулять, чего опасаться' },
    budget: 'none',
  },
  OTHER: {
    twoRequired: false,
    toggleLabel: 'Нужно два адреса (откуда и куда)',
    one: { label: 'Адрес', placeholder: 'Где нужно выполнить поручение' },
    from: { label: 'Откуда', placeholder: 'Адрес' },
    to: { label: 'Куда', placeholder: 'Адрес' },
    desc: { label: 'Комментарий к заказу', placeholder: 'Опишите, что нужно сделать' },
    budget: 'optional',
  },
};

/** Labels of the addresses of an order: with a first point ("from") or with a single address. */
export function placeLabels(category: Category, hasFrom: boolean): { from: string; to: string } {
  const c = CATEGORY_CONFIG[category];
  return hasFrom
    ? { from: c.from.label.replace(/\s*\(.*\)/, ''), to: c.to.label.replace(/\s*\(.*\)/, '') }
    : { from: '', to: c.one.label };
}

// ---- address details (entrance, floor, apartment, intercom, note), stored as small JSON text
export interface AddrDetails {
  entrance?: string;
  floor?: string;
  apt?: string;
  intercom?: string;
  note?: string;
}

export function parseDetails(json: string | null | undefined): AddrDetails {
  if (!json) return {};
  try {
    const o = JSON.parse(json);
    return o && typeof o === 'object' ? (o as AddrDetails) : {};
  } catch {
    return {};
  }
}

/** null when everything is empty. */
export function stringifyDetails(d: AddrDetails): string | null {
  const clean: AddrDetails = {};
  (Object.keys(d) as (keyof AddrDetails)[]).forEach((k) => {
    const v = (d[k] ?? '').trim();
    if (v) clean[k] = v;
  });
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

/** "подъезд 2, этаж 4, кв. 15, домофон 15 · комментарий" */
export function detailsText(d: AddrDetails): string {
  const parts: string[] = [];
  if (d.entrance) parts.push(`подъезд ${d.entrance}`);
  if (d.floor) parts.push(`этаж ${d.floor}`);
  if (d.apt) parts.push(`кв./офис ${d.apt}`);
  if (d.intercom) parts.push(`домофон ${d.intercom}`);
  const base = parts.join(', ');
  return d.note ? (base ? `${base} · ${d.note}` : d.note) : base;
}

/** Orders that need my rating: finished, and I have not rated the other side yet. */
export function ratingReminder(t: Task, asOwner: boolean): BadgeInfo | null {
  if (t.status !== 'DONE') return null;
  if (asOwner) return t.rating ? null : { text: 'Оцените исполнителя', tone: 'orange' };
  return t.requesterRating ? null : { text: 'Оцените заказчика', tone: 'orange' };
}

/** "Откуда → Куда" for two-address orders, otherwise just the address. */
export const routeText = (t: Task) => (t.fromLocation ? `${t.fromLocation} → ${t.location}` : t.location);

/** "1 балл", "2 балла", "5 баллов" */
export function pointsText(n: number): string {
  const abs = Math.abs(n);
  const m10 = abs % 10;
  const m100 = abs % 100;
  const word = m10 === 1 && m100 !== 11 ? 'балл' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'балла' : 'баллов';
  return `${n.toLocaleString('ru-RU')} ${word}`;
}

export const isPaid = (t: Task) => t.payment?.status === 'PAID' || t.payment?.status === 'RELEASED';

export const shortDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length !== 11) return p;
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}


export function formatTimer(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const money = (n: number) => `${n.toLocaleString('ru-RU')} ₸`;

export const groupDigits = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const firstName = (full: string) => full.trim().split(/\s+/)[0] || full;

const hhmm = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function dayLabel(d: Date): string {
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(d) - day0(new Date())) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** "Сегодня до 18:00" */
export function whenText(iso: string): string {
  const d = new Date(iso);
  return `${dayLabel(d)} до ${hhmm(d)}`;
}

/** "Сегодня до 18:00" or, for a time window, "Сегодня 19:00–20:00". */
export function taskWhen(t: { startAt: string | null; deadline: string }): string {
  if (!t.startAt) return whenText(t.deadline);
  const s = new Date(t.startAt);
  const e = new Date(t.deadline);
  return s.toDateString() === e.toDateString()
    ? `${dayLabel(s)} ${hhmm(s)}–${hhmm(e)}`
    : `${dayLabel(s)} ${hhmm(s)} – ${dayLabel(e)} ${hhmm(e)}`;
}

export interface BadgeInfo {
  text: string;
  tone: 'yellow' | 'orange' | 'green' | 'gray';
}

export function taskBadge(t: Task): BadgeInfo {
  switch (t.status) {
    case 'OPEN':
      return t.owner && t.responseCount > 0
        ? { text: `Есть отклики · ${t.responseCount}`, tone: 'yellow' }
        : { text: t.owner ? 'Ждёт откликов' : 'Открыт', tone: 'gray' };
    case 'ACCEPTED':
      return t.payment?.status === 'PAID'
        ? { text: 'Оплачен', tone: 'orange' }
        : { text: 'Ждёт оплаты', tone: 'yellow' };
    case 'IN_PROGRESS':
      return t.awaitingConfirmation
        ? { text: 'Ждёт подтверждения', tone: 'yellow' }
        : { text: 'В работе', tone: 'orange' };
    case 'DONE':
      return { text: 'Выполнен', tone: 'green' };
    default:
      return { text: 'Отменён', tone: 'gray' };
  }
}

export function workBadge(item: WorkItem): BadgeInfo {
  if (!item.response) return taskBadge(item.task);
  if (item.task.status === 'OPEN') return { text: 'Подан', tone: 'yellow' };
  if (item.task.status === 'CANCELLED') return { text: 'Заказ отменён', tone: 'gray' };
  return { text: 'Не выбран', tone: 'gray' };
}

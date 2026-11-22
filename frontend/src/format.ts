import type { Category, Task, WorkItem } from './api';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'PICKUP', label: 'Забрать заказ' },
  { value: 'QUEUE', label: 'Очередь' },
  { value: 'BUY', label: 'Купить товар' },
  { value: 'DOG_WALK', label: 'Выгулять собаку' },
  { value: 'OTHER', label: 'Другое' },
];

/** Labels of the address fields. Two-address orders ask "from where" and "to where". */
export const PLACE_LABELS: Record<Category, {
  from?: { label: string; placeholder: string };
  to: { label: string; placeholder: string };
}> = {
  PICKUP: {
    from: { label: 'Откуда забрать', placeholder: 'Пункт выдачи, магазин или адрес' },
    to: { label: 'Куда доставить (где оставить)', placeholder: 'Адрес, куда привезти' },
  },
  BUY: {
    from: { label: 'Где купить', placeholder: 'Магазин, торговый центр, аптека' },
    to: { label: 'Куда привезти (где оставить)', placeholder: 'Адрес, куда привезти' },
  },
  QUEUE: { to: { label: 'Где нужно постоять', placeholder: 'Адрес, например «Центр обслуживания»' } },
  DOG_WALK: { to: { label: 'Где забрать собаку', placeholder: 'Адрес' } },
  OTHER: { to: { label: 'Адрес', placeholder: 'Где нужно выполнить поручение' } },
};

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

export function whenText(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day0(d) - day0(new Date())) / 86400000);
  let day: string;
  if (diff === 0) day = 'Сегодня';
  else if (diff === 1) day = 'Завтра';
  else if (diff === -1) day = 'Вчера';
  else day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  return `${day} до ${time}`;
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

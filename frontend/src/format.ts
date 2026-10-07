import type { Category, Task, WorkItem } from './api';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'PICKUP', label: 'Забрать заказ' },
  { value: 'QUEUE', label: 'Очередь' },
  { value: 'BUY', label: 'Купить товар' },
  { value: 'DOG_WALK', label: 'Выгулять собаку' },
  { value: 'OTHER', label: 'Другое' },
];

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
      return { text: 'Назначен', tone: 'orange' };
    case 'IN_PROGRESS':
      return { text: 'В работе', tone: 'orange' };
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

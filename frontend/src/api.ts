export type Mode = 'REQUESTER' | 'RUNNER';
export type Channel = 'PHONE' | 'EMAIL';
export type Category = 'PICKUP' | 'QUEUE' | 'BUY' | 'DOG_WALK' | 'OTHER';
export type TaskStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type Scope = 'active' | 'history';

export interface User {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  mode: Mode;
  createdAt: string;
  rating: number | null;
  ratingCount: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface StartBody {
  fullName: string;
  channel: Channel;
  contact: string;
  password: string;
}

export interface StartResponse {
  contact: string; // normalized phone / e-mail, send it back in verify()
  resendInSeconds: number;
  devCode: string | null; // only in test mode
}

/** Another user. contact is set only for the other side of an assigned task. */
export interface Person {
  id: number;
  name: string;
  rating: number | null;
  ratingCount: number;
  completed: number;
  contact: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  category: Category;
  location: string;
  deadline: string; // "2026-10-07T18:00:00" (Almaty time, no zone)
  reward: number;
  status: TaskStatus;
  createdAt: string;
  owner: boolean; // I am the requester
  requester: Person;
  runner: Person | null;
  responseCount: number;
  myPrice: number | null; // my own response price, if I responded
  rating: number | null; // requester's rating of the runner
}

export interface Offer {
  id: number;
  runner: Person;
  price: number;
  createdAt: string;
}

export interface WorkItem {
  task: Task;
  myPrice: number | null;
  response: boolean; // true = my response, false = a task assigned to me
}

export interface NewTask {
  category: Category | null;
  title: string;
  location: string;
  deadline: string | null; // "2026-10-07T18:00"
  description: string;
  reward: number | null;
}

export const TOKEN_KEY = 'komek_token';
export const saveToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Нет связи с сервером. Проверьте подключение.');
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // token expired or user was removed: back to the start screen
    clearToken();
    window.location.assign('/welcome');
  }
  if (!res.ok) throw new Error(data?.message ?? 'Что-то пошло не так. Попробуйте ещё раз.');
  return data as T;
}

export const api = {
  // auth
  startRegistration: (b: StartBody) => request<StartResponse>('/auth/register/start', 'POST', b),
  verify: (contact: string, code: string) =>
    request<AuthResponse>('/auth/register/verify', 'POST', { contact, code }),
  login: (login: string, password: string) =>
    request<AuthResponse>('/auth/login', 'POST', { login, password }),
  me: () => request<User>('/users/me'),
  setMode: (mode: Mode) => request<User>('/users/me/mode', 'PATCH', { mode }),

  // requester
  createTask: (b: NewTask) => request<Task>('/tasks', 'POST', b),
  myTasks: (scope: Scope) => request<Task[]>(`/tasks/mine?scope=${scope}`),
  offers: (id: number) => request<Offer[]>(`/tasks/${id}/responses`),
  selectOffer: (id: number, offerId: number) => request<Task>(`/tasks/${id}/responses/${offerId}/select`, 'POST'),
  cancel: (id: number) => request<Task>(`/tasks/${id}/cancel`, 'POST'),
  rate: (id: number, rating: number) => request<Task>(`/tasks/${id}/rating`, 'POST', { rating }),

  // runner
  feed: (q: string, category?: Category) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (category) p.set('category', category);
    return request<Task[]>(`/tasks/feed?${p.toString()}`);
  },
  work: (scope: Scope) => request<WorkItem[]>(`/tasks/work?scope=${scope}`),
  respond: (id: number, price: number | null) => request<Task>(`/tasks/${id}/responses`, 'POST', { price }),
  withdraw: (id: number) => request<Task>(`/tasks/${id}/responses/me`, 'DELETE'),
  start: (id: number) => request<Task>(`/tasks/${id}/start`, 'POST'),
  complete: (id: number) => request<Task>(`/tasks/${id}/complete`, 'POST'),

  // both
  task: (id: number) => request<Task>(`/tasks/${id}`),
};

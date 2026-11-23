import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, NotifSummary } from './api';
import { useAuth } from './AuthContext';

interface Ctx {
  summary: NotifSummary;
  refresh: () => void;
}

const EMPTY: NotifSummary = { orders: 0, tasks: 0, profile: 0, unread: 0 };
const NotifCtx = createContext<Ctx>({ summary: EMPTY, refresh: () => {} });

/** Numbers for the "+1" marks on the tab bar and the bell. Loaded when the app opens and about once a minute. */
export function NotifProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<NotifSummary>(EMPTY);

  const refresh = useCallback(() => {
    if (!user) return;
    api.notifSummary().then(setSummary).catch(() => {});
  }, [user]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return <NotifCtx.Provider value={{ summary, refresh }}>{children}</NotifCtx.Provider>;
}

export const useNotif = () => useContext(NotifCtx);

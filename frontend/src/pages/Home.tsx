import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Category } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES, firstName, whenText } from '../format';
import { useLoad } from '../hooks';
import Hero from '../components/Hero';
import Logo from '../components/Logo';
import TaskCard from '../components/TaskCard';

export default function Home() {
  const { user } = useAuth();
  if (!user) return null;
  return user.mode === 'RUNNER' ? <RunnerHome /> : <RequesterHome name={firstName(user.fullName)} />;
}

function RequesterHome({ name }: { name: string }) {
  return (
    <>
      <Logo />
      <Hero title={<>Поручите дело.<br />Займитесь своим.</>} sub="Очередь, посылка, прогулка с собакой" />
      <h1 className="greeting">Привет, {name}</h1>
      <div className="actions">
        <Link className="btn" to="/new">Создать заказ</Link>
      </div>
    </>
  );
}

/** Runner's feed: open tasks of other people, with search and category filter. */
function RunnerHome() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cat, setCat] = useState<Category | ''>('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error } = useLoad(() => api.feed(debounced, cat || undefined), [debounced, cat]);

  return (
    <>
      <Logo />
      <input className="search" type="search" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
      <Hero title={<>Выполните дело.<br />Заработайте в свободное время.</>} />

      <div className="chips">
        <button type="button" className={'chip' + (cat === '' ? ' on' : '')} onClick={() => setCat('')}>Все</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} type="button" className={'chip' + (cat === c.value ? ' on' : '')} onClick={() => setCat(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      <h2 className="h2">Задания рядом</h2>
      {error && <div className="err">{error}</div>}
      {loading && !data && <div className="empty">Загрузка…</div>}
      {data && data.length === 0 && (
        <div className="empty">
          {debounced || cat ? 'Ничего не нашли. Попробуйте изменить поиск.' : 'Пока нет заданий. Загляните чуть позже.'}
        </div>
      )}
      {data?.map((t) => (
        <TaskCard key={t.id} to={`/task/${t.id}`} title={t.title} meta={whenText(t.deadline).toLowerCase()} price={t.reward} />
      ))}
    </>
  );
}

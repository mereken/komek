import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Category } from '../api';
import { useAuth } from '../AuthContext';
import { CATEGORIES, firstName, money, routeText, whenText } from '../format';
import { useLoad } from '../hooks';
import CategoryIcon from '../components/CategoryIcon';
import EmptyState from '../components/EmptyState';
import Hero from '../components/Hero';
import Logo from '../components/Logo';
import ListSkeleton from '../components/Skeleton';
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
      <Hero compact title={<>Поручите дело.<br />Займитесь своим.</>} sub="Очередь, посылка, прогулка с собакой" />
      <h1 className="greeting">Привет, {name}</h1>

      <h2 className="h2">Что нужно сделать?</h2>
      <div className="tiles">
        {CATEGORIES.map((c) => (
          <Link key={c.value} to={`/new?category=${c.value}`} className="tile">
            <CategoryIcon category={c.value} size={26} />
            <span>{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="actions">
        <Link className="btn" to="/new">Создать заказ</Link>
      </div>
    </>
  );
}

/** Tappable examples under the search field: they show what can be searched. */
const SEARCH_EXAMPLES = ['Мега', 'аптека', 'посылка', 'собака'];

/** Runner's feed: open tasks of other people, with search and category filter. */
function RunnerHome() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cat, setCat] = useState<Category | ''>('');
  const [hideMine, setHideMine] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error } = useLoad(() => api.feed(debounced, cat || undefined), [debounced, cat]);

  const hasMine = (data ?? []).some((t) => t.myPrice != null);
  const list = (data ?? []).filter((t) => !(hideMine && t.myPrice != null));

  return (
    <>
      <Logo />

      <div className="searchbox">
        <svg className="searchbox-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input type="text" enterKeyHint="search" autoComplete="off" placeholder="Поиск заданий"
               value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button type="button" className="searchbox-clear" aria-label="Очистить поиск" onClick={() => setQ('')}>×</button>}
      </div>
      {q === '' && (
        <div className="examples">
          <span>Например:</span>
          {SEARCH_EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setQ(e)}>{e}</button>
          ))}
        </div>
      )}

      <Hero compact title={<>Выполните дело.<br />Заработайте в свободное время.</>} />

      <div className="chips">
        <button type="button" className={'chip' + (cat === '' ? ' on' : '')} onClick={() => setCat('')}>Все</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} type="button" className={'chip' + (cat === c.value ? ' on' : '')} onClick={() => setCat(c.value)}>
            <CategoryIcon category={c.value} size={16} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="feed-head">
        <h2 className="h2">Задания рядом</h2>
        {hasMine && (
          <button type="button" className={'pill' + (hideMine ? ' on' : '')} onClick={() => setHideMine((v) => !v)}>
            Скрыть мои отклики
          </button>
        )}
      </div>

      {error && <div className="err">{error}</div>}
      {loading && !data && <ListSkeleton />}
      {data && list.length === 0 && (
        <EmptyState
          title={debounced || cat ? 'Ничего не нашли' : hideMine ? 'Все задания уже с вашими откликами' : 'Пока нет заданий'}
          text={debounced || cat ? 'Попробуйте изменить поиск или выбрать другую категорию.' : 'Загляните чуть позже, новые задания появляются здесь.'}
        />
      )}
      {list.map((t) => (
        <TaskCard
          key={t.id}
          to={`/task/${t.id}`}
          title={t.title}
          category={t.category}
          place={routeText(t)}
          meta={whenText(t.deadline).toLowerCase()}
          price={t.reward}
          badge={t.myPrice != null ? { text: `Вы откликнулись · ${money(t.myPrice)}`, tone: 'yellow' } : undefined}
        />
      ))}
    </>
  );
}

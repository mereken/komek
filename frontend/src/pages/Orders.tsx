import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Scope } from '../api';
import { ratingReminder, routeText, taskBadge, taskWhen } from '../format';
import { useLoad } from '../hooks';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import ListSkeleton from '../components/Skeleton';
import TaskCard from '../components/TaskCard';

export default function Orders() {
  const [scope, setScope] = useState<Scope>('active');
  const { data, loading, error } = useLoad(() => api.myTasks(scope), [scope]);

  return (
    <>
      <h1 className="title">Заказы</h1>
      <Segmented<Scope>
        options={[{ value: 'active', label: 'Активные' }, { value: 'history', label: 'История' }]}
        value={scope}
        onChange={setScope}
      />

      {error && <div className="err">{error}</div>}
      {loading && !data && <ListSkeleton />}
      {data && data.length === 0 && (
        scope === 'active' ? (
          <EmptyState title="Активных заказов пока нет" text="Создайте заказ, и исполнители откликнутся на него." to="/new" action="Создать заказ" />
        ) : (
          <EmptyState title="История пуста" text="Здесь появятся выполненные и отменённые заказы." />
        )
      )}
      {data?.map((t) => (
        <div key={t.id} className="card-wrap">
          <TaskCard
            to={`/task/${t.id}`}
            title={t.title}
            category={t.category}
            place={routeText(t)}
            meta={t.runner ? `Исполнитель: ${t.runner.name}` : taskWhen(t).toLowerCase()}
            price={t.reward}
            badge={ratingReminder(t, true) ?? taskBadge(t)}
            fresh={t.updates > 0}
          />
          {scope === 'history' && (
            <Link className="repeat-link" to={`/new?repeat=${t.id}`}>↻ Повторить заказ</Link>
          )}
        </div>
      ))}
    </>
  );
}

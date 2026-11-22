import { useState } from 'react';
import { api, Scope } from '../api';
import { routeText, taskBadge, whenText } from '../format';
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
        <TaskCard
          key={t.id}
          to={`/task/${t.id}`}
          title={t.title}
          category={t.category}
          place={routeText(t)}
          meta={t.runner ? `Исполнитель: ${t.runner.name}` : whenText(t.deadline).toLowerCase()}
          price={t.reward}
          badge={taskBadge(t)}
        />
      ))}
    </>
  );
}

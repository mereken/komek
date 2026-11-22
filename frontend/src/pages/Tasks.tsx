import { useState } from 'react';
import { api, Scope, WorkItem } from '../api';
import { routeText, workBadge } from '../format';
import { useLoad } from '../hooks';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import ListSkeleton from '../components/Skeleton';
import TaskCard from '../components/TaskCard';

function Card({ item }: { item: WorkItem }) {
  const t = item.task;
  return (
    <TaskCard
      to={`/task/${t.id}`}
      title={t.title}
      category={t.category}
      place={routeText(t)}
      meta={`Заказчик: ${t.requester.name}`}
      price={item.response ? item.myPrice ?? t.reward : t.reward}
      badge={workBadge(item)}
      chevron
    />
  );
}

export default function Tasks() {
  const [scope, setScope] = useState<Scope>('active');
  const { data, loading, error } = useLoad(() => api.work(scope), [scope]);

  const inWork = data?.filter((i) => !i.response) ?? [];
  const responses = data?.filter((i) => i.response) ?? [];

  return (
    <>
      <h1 className="title">Задания</h1>
      <Segmented<Scope>
        options={[{ value: 'active', label: 'Активные' }, { value: 'history', label: 'История' }]}
        value={scope}
        onChange={setScope}
      />

      {error && <div className="err">{error}</div>}
      {loading && !data && <ListSkeleton />}
      {data && data.length === 0 && (
        scope === 'active' ? (
          <EmptyState title="Пока нет активных заданий" text="Откликайтесь на задания в ленте, и они появятся здесь." to="/home" action="Найти задание" />
        ) : (
          <EmptyState title="История пуста" text="Здесь появятся выполненные задания." />
        )
      )}

      {scope === 'active' ? (
        <>
          {inWork.length > 0 && <div className="section">В работе</div>}
          {inWork.map((i) => <Card key={`w${i.task.id}`} item={i} />)}
          {responses.length > 0 && <div className="section">Отклики</div>}
          {responses.map((i) => <Card key={`r${i.task.id}`} item={i} />)}
        </>
      ) : (
        data?.map((i) => <Card key={`${i.response ? 'r' : 'w'}${i.task.id}`} item={i} />)
      )}
    </>
  );
}

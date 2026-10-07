import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Scope, WorkItem } from '../api';
import { workBadge } from '../format';
import { useLoad } from '../hooks';
import Segmented from '../components/Segmented';
import TaskCard from '../components/TaskCard';

function Card({ item }: { item: WorkItem }) {
  const t = item.task;
  return (
    <TaskCard
      to={`/task/${t.id}`}
      title={t.title}
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
      {loading && !data && <div className="empty">Загрузка…</div>}
      {data && data.length === 0 && (
        <div className="empty">
          {scope === 'active' ? (
            <>Пока нет активных заданий.<br /><Link to="/home">Найти задание</Link></>
          ) : 'История пуста: здесь появятся выполненные задания.'}
        </div>
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

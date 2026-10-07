import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Scope } from '../api';
import { taskBadge, whenText } from '../format';
import { useLoad } from '../hooks';
import Segmented from '../components/Segmented';
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
      {loading && !data && <div className="empty">Загрузка…</div>}
      {data && data.length === 0 && (
        <div className="empty">
          {scope === 'active' ? (
            <>Активных заказов пока нет.<br /><Link to="/new">Создать заказ</Link></>
          ) : 'История пуста: здесь появятся выполненные и отменённые заказы.'}
        </div>
      )}
      {data?.map((t) => (
        <TaskCard
          key={t.id}
          to={`/task/${t.id}`}
          title={t.title}
          meta={t.runner ? `Исполнитель: ${t.runner.name}` : whenText(t.deadline).toLowerCase()}
          price={t.reward}
          badge={taskBadge(t)}
        />
      ))}
    </>
  );
}

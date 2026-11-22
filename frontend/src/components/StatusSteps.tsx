import type { Task } from '../api';

const STEPS = ['Опубликован', 'Выбран', 'Оплачен', 'В работе', 'Проверка', 'Готово'];

/** Which step the order is on. DONE = after the last step, so every step looks finished. */
function currentStep(t: Task): number {
  switch (t.status) {
    case 'OPEN': return 0;
    case 'ACCEPTED': return t.payment?.status === 'PAID' ? 2 : 1;
    case 'IN_PROGRESS': return t.awaitingConfirmation ? 4 : 3;
    case 'DONE': return STEPS.length;
    default: return -1;
  }
}

/** Progress of an order: Опубликован → Выбран → Оплачен → В работе → Проверка → Готово. */
export default function StatusSteps({ task }: { task: Task }) {
  const cur = currentStep(task);
  if (cur < 0) return null; // cancelled orders show their own note
  return (
    <ol className="steps" aria-label="Этапы заказа">
      {STEPS.map((label, i) => (
        <li key={label} className={i < cur ? 'done' : i === cur ? 'cur' : ''}>
          <span>{i < cur ? '✓' : i + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
}

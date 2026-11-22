import { PLACE_LABELS, money, whenText } from '../format';
import type { Task } from '../api';

/** Addresses ("Откуда" / "Куда" or one "Где"), time and price of an order. */
export default function InfoBox({ task }: { task: Task }) {
  const labels = PLACE_LABELS[task.category];
  return (
    <div className="infobox">
      {task.fromLocation && <div><span className="k">{labels.from?.label.replace(/\s*\(.*\)/, '') ?? 'Откуда'}</span><b>{task.fromLocation}</b></div>}
      <div>
        <span className="k">{task.fromLocation ? labels.to.label.replace(/\s*\(.*\)/, '') : labels.to.label}</span>
        <b>{task.location}</b>
      </div>
      <div><span className="k">Когда</span><b>{whenText(task.deadline)}</b></div>
      <div><span className="k">Цена</span><b>{money(task.reward)}</b></div>
    </div>
  );
}

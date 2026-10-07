import { money, whenText } from '../format';
import type { Task } from '../api';

export default function InfoBox({ task }: { task: Task }) {
  return (
    <div className="infobox">
      <div><span className="k">Где</span><b>{task.location}</b></div>
      <div><span className="k">Когда</span><b>{whenText(task.deadline)}</b></div>
      <div><span className="k">Цена</span><b>{money(task.reward)}</b></div>
    </div>
  );
}

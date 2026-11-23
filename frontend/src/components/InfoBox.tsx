import { detailsText, money, parseDetails, placeLabels, taskWhen } from '../format';
import type { Task } from '../api';

/** Addresses (with entrance / floor details when allowed), time, price and money for expenses of an order. */
export default function InfoBox({ task }: { task: Task }) {
  const labels = placeLabels(task.category, !!task.fromLocation);
  const fromD = detailsText(parseDetails(task.fromDetails));
  const toD = detailsText(parseDetails(task.locationDetails));
  return (
    <div className="infobox">
      {task.fromLocation && (
        <div>
          <span className="k">{labels.from}</span>
          <b>{task.fromLocation}</b>
          {fromD && <small className="details-line">{fromD}</small>}
        </div>
      )}
      <div>
        <span className="k">{labels.to}</span>
        <b>{task.location}</b>
        {toD && <small className="details-line">{toD}</small>}
      </div>
      <div><span className="k">Когда</span><b>{taskWhen(task)}</b></div>
      <div>
        <span className="k">Вознаграждение</span>
        <b>{money(task.reward)}</b>
        <small className="details-line">{task.allowOffers ? 'Можно предложить свою цену' : 'Цена фиксированная'}</small>
      </div>
      {task.budget > 0 && (
        <div>
          <span className="k">Деньги на расходы</span>
          <b>{money(task.budget)}</b>
          <small className="details-line">Выдаются исполнителю авансом, когда он начнёт</small>
        </div>
      )}
    </div>
  );
}

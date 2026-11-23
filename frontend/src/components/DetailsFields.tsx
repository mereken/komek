import { useState } from 'react';
import { AddrDetails, detailsText } from '../format';

/**
 * "Подробности" under an address: entrance, floor, apartment, intercom, a note for the runner.
 * Collapsed by default so the form stays simple. Only the chosen runner sees these details.
 */
export default function DetailsFields({ value, onChange }: { value: AddrDetails; onChange: (v: AddrDetails) => void }) {
  const filled = detailsText(value);
  const [open, setOpen] = useState(!!filled);
  const set = (k: keyof AddrDetails) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });

  return (
    <div className="details">
      <button type="button" className="link small-link" onClick={() => setOpen((o) => !o)}>
        {open ? '− Скрыть подробности' : filled ? `Подробности: ${filled}` : '+ Подъезд, этаж, квартира, домофон'}
      </button>
      {open && (
        <div className="details-grid">
          <input aria-label="Подъезд" placeholder="Подъезд" maxLength={10} value={value.entrance ?? ''} onChange={set('entrance')} />
          <input aria-label="Этаж" placeholder="Этаж" maxLength={10} value={value.floor ?? ''} onChange={set('floor')} />
          <input aria-label="Квартира или офис" placeholder="Кв. / офис" maxLength={12} value={value.apt ?? ''} onChange={set('apt')} />
          <input aria-label="Домофон" placeholder="Домофон" maxLength={12} value={value.intercom ?? ''} onChange={set('intercom')} />
          <input className="wide" aria-label="Комментарий курьеру" placeholder="Комментарий: как пройти, позвонить за 5 минут…" maxLength={120}
                 value={value.note ?? ''} onChange={set('note')} />
          <span className="hint wide">Эти подробности увидит только выбранный исполнитель.</span>
        </div>
      )}
    </div>
  );
}

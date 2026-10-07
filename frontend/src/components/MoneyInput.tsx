import { groupDigits } from '../format';

/** Digits only, shown as "2 500" with a ₸ sign. value is a string of digits. */
export default function MoneyInput({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="moneyfield">
      <input id={id} inputMode="numeric" placeholder="0" value={groupDigits(value)}
             onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 7))} />
      <span>₸</span>
    </div>
  );
}

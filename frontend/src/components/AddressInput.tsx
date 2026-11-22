import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { api, Place } from '../api';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

/**
 * Address field with suggestions as you type (real places around Almaty: "мега", "абая 10", ...).
 * The user can always ignore the list and type any address by hand.
 */
export default function AddressInput({ id, value, onChange, placeholder, invalid }: Props) {
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false); // ask for suggestions only after the user typed (not after picking one)
  const seq = useRef(0); // ignores answers that arrive late

  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    setLoading(true);
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const r = await api.places(q);
        if (n === seq.current) { setItems(r); setActive(-1); }
      } catch {
        if (n === seq.current) setItems([]);
      } finally {
        if (n === seq.current) { setLoading(false); setSearched(true); }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const pick = (p: Place) => {
    typed.current = false;
    seq.current++;
    onChange(p.text);
    setItems([]);
    setOpen(false);
    setSearched(false);
    setLoading(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && value.trim().length >= 2 && (loading || items.length > 0 || searched);

  return (
    <div className="addr">
      <input
        id={id}
        autoComplete="off"
        maxLength={200}
        placeholder={placeholder}
        className={invalid ? 'invalid' : ''}
        value={value}
        onChange={(e) => { typed.current = true; setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul className="addr-list" onMouseDown={(e) => e.preventDefault()}>
          {items.map((p, i) => (
            <li key={`${p.text}-${i}`}>
              <button type="button" className={i === active ? 'on' : ''} onClick={() => pick(p)}>
                <svg className="addr-pin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>
                  <b>{p.title}</b>
                  {p.subtitle && <small>{p.subtitle}</small>}
                </span>
              </button>
            </li>
          ))}
          {loading && items.length === 0 && <li className="addr-note">Ищем…</li>}
          {!loading && items.length === 0 && <li className="addr-note">Ничего не нашли. Можно ввести адрес вручную.</li>}
        </ul>
      )}
    </div>
  );
}

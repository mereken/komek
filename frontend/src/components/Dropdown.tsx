import { useState } from 'react';

interface Props<T extends string> {
  id?: string;
  value: T | '';
  options: { value: T; label: string }[];
  placeholder: string;
  onChange: (v: T) => void;
}

/** The "Что нужно сделать" list from the design. */
export default function Dropdown<T extends string>({ id, value, options, placeholder, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="select">
      <button id={id} type="button" className={'select-btn' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
        <span className={current ? '' : 'ph'}>{current ? current.label : placeholder}</span>
        <span className="chevron">{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <ul className="select-list">
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" className={o.value === value ? 'on' : ''}
                      onClick={() => { onChange(o.value); setOpen(false); }}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

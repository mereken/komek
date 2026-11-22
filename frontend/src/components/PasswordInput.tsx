import { useState } from 'react';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  invalid?: boolean;
  maxLength?: number;
}

/** Password field with an "eye" button that shows / hides what was typed. */
export default function PasswordInput({ id, value, onChange, placeholder, autoComplete, invalid, maxLength }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwfield">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        className={invalid ? 'invalid' : ''}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="pw-eye" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={show} onClick={() => setShow((s) => !s)}>
        {show ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

import { useEffect, useRef } from 'react';

interface Props {
  value: string; // digits typed so far, e.g. "481"
  onChange: (v: string) => void;
  invalid?: boolean;
  length?: number;
}

/** Six separate boxes that behave like one field: auto-advance, backspace, paste, SMS autofill. */
export default function OtpInput({ value, onChange, invalid, length = 6 }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

  return (
    <div className="otp">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={invalid ? 'invalid' : ''}
          value={value[i] ?? ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Цифра ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '');
            if (!d) return;
            if (d.length >= length) { // SMS autofill delivers the whole code at once
              onChange(d.slice(0, length));
              focus(length - 1);
              return;
            }
            const ch = d[d.length - 1]; // typing over a filled box: newest digit wins
            onChange((value.slice(0, i) + ch + value.slice(i + 1)).slice(0, length));
            focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Backspace') return;
            e.preventDefault();
            if (value[i]) {
              onChange(value.slice(0, i) + value.slice(i + 1));
            } else if (i > 0) {
              onChange(value.slice(0, i - 1) + value.slice(i));
              focus(i - 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (d) { onChange(d); focus(d.length); }
          }}
        />
      ))}
    </div>
  );
}

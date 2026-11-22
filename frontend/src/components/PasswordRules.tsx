import { PASSWORD_RULES } from '../validation';

/** Live checklist under a new-password field. */
export default function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="pw-rules">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={ok ? 'ok' : ''}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}
          </li>
        );
      })}
    </ul>
  );
}

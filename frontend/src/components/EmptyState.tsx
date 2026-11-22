import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  text?: ReactNode;
  to?: string; // optional action button
  action?: string;
}

/** Friendly empty screen: a short title, a hint and (optionally) the next step. */
export default function EmptyState({ title, text, to, action }: Props) {
  return (
    <div className="emptystate">
      <div className="emptystate-ico" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
          <path d="M3 7l9 4 9-4M12 11v10" />
        </svg>
      </div>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {to && action && <Link className="btn small" to={to}>{action}</Link>}
    </div>
  );
}

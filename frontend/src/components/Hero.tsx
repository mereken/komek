import { ReactNode } from 'react';

export default function Hero({ title, sub }: { title: ReactNode; sub?: string }) {
  return (
    <div className="hero">
      <div className="pin">
        <svg width="42" height="52" viewBox="0 0 48 60" aria-hidden="true">
          <path d="M24 0C10.7 0 0 10.7 0 24c0 17 24 36 24 36s24-19 24-36C48 10.7 37.3 0 24 0z" fill="#F2B233" />
        </svg>
      </div>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

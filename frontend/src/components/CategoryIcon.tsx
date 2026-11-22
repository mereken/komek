import type { ReactNode } from 'react';
import type { Category } from '../api';

const PATHS: Record<Category, ReactNode> = {
  PICKUP: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  QUEUE: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  BUY: (
    <>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  DOG_WALK: (
    <>
      <circle cx="7" cy="10" r="1.6" />
      <circle cx="11" cy="6.5" r="1.6" />
      <circle cx="16" cy="7.5" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
      <path d="M8 17.5c0-2.5 2-4.5 4.2-4.5s4.3 2 4.3 4.5c0 1.6-1.2 2.5-2.5 2.5-.9 0-1.2-.5-1.8-.5s-.9.5-1.8.5C9.2 20 8 19.1 8 17.5z" />
    </>
  ),
  OTHER: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
};

export default function CategoryIcon({ category, size = 22 }: { category: Category; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[category]}
    </svg>
  );
}

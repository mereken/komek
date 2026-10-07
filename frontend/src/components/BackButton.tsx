import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/home' }: { fallback?: string }) {
  const nav = useNavigate();
  return (
    <button type="button" className="back" aria-label="Назад"
            onClick={() => (window.history.length > 1 ? nav(-1) : nav(fallback))}>
      ←
    </button>
  );
}

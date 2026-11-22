import { ReactNode, useEffect } from 'react';

/** Simple bottom sheet / dialog. Closes on the × button, a click outside, or Escape. */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <button type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

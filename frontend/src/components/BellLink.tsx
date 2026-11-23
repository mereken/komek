import { Link } from 'react-router-dom';
import { useNotif } from '../NotifContext';

/** Bell in the header: opens the list of news; shows how many are unread. */
export default function BellLink() {
  const { summary } = useNotif();
  return (
    <Link to="/notifications" className="bell" aria-label={summary.unread ? `Уведомления: ${summary.unread} новых` : 'Уведомления'}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      </svg>
      {summary.unread > 0 && <span className="bell-badge">{summary.unread > 9 ? '9+' : summary.unread}</span>}
    </Link>
  );
}

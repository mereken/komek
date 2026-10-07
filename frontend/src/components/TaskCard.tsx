import { Link } from 'react-router-dom';
import { BadgeInfo, money } from '../format';
import Badge from './Badge';

interface Props {
  to: string;
  title: string;
  meta: string;
  price: number;
  badge?: BadgeInfo;
  chevron?: boolean;
}

export default function TaskCard({ to, title, meta, price, badge, chevron }: Props) {
  return (
    <Link to={to} className="tcard">
      <div className="tcard-top">
        <b>{title}</b>
        <span className="price">{money(price)}</span>
      </div>
      <div className="tcard-meta">{meta}</div>
      {badge && <Badge {...badge} />}
      {chevron && <span className="chev">›</span>}
    </Link>
  );
}

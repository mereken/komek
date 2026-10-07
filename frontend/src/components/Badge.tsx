import type { BadgeInfo } from '../format';

export default function Badge({ text, tone }: BadgeInfo) {
  return <span className={`badge ${tone}`}>{text}</span>;
}

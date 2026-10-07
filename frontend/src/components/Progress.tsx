export default function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="progress">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= step ? 'on' : ''} />
      ))}
    </div>
  );
}

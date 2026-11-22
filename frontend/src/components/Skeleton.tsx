/** Grey placeholder cards shown while a list is loading (instead of the word "Загрузка…"). */
export default function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel-line w60" />
          <div className="skel-line w90" />
          <div className="skel-line w40" />
        </div>
      ))}
    </div>
  );
}

/** Round profile photo, or the first letter of the name when there is no photo. */
export default function Avatar({ name, url, size }: { name: string; url?: string | null; size?: 'lg' | 'xl' }) {
  return (
    <div className={'avatar' + (size ? ` ${size}` : '')}>
      {url ? <img src={url} alt="" loading="lazy" /> : name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

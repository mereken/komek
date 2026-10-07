import type { Person } from '../api';
import ContactLink from './ContactLink';

/** Avatar + name + rating, optionally with a call/mail link. */
export default function PersonRow({ person, showContact }: { person: Person; showContact?: boolean }) {
  return (
    <div className="card">
      <div className="who">
        <div className="avatar">{person.name.trim().charAt(0).toUpperCase()}</div>
        <div>
          <b>{person.name}</b>
          <div className="m">{person.rating != null ? `★ ${person.rating}` : 'Новичок'}</div>
        </div>
      </div>
      {showContact && <ContactLink contact={person.contact} />}
    </div>
  );
}

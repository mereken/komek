import type { Person } from '../api';
import Avatar from './Avatar';
import ContactLink from './ContactLink';

/** Avatar + name + rating, optionally with a call/mail link. newLabel is shown when there are no ratings yet. */
export default function PersonRow({ person, showContact, newLabel = 'Новичок' }: {
  person: Person;
  showContact?: boolean;
  newLabel?: string;
}) {
  return (
    <div className="card">
      <div className="who">
        <Avatar name={person.name} url={person.avatarUrl} />
        <div>
          <b>{person.name}</b>
          <div className="m">
            {person.rating != null ? `★ ${person.rating} · оценок: ${person.ratingCount}` : newLabel}
          </div>
        </div>
      </div>
      {showContact && <ContactLink contact={person.contact} />}
    </div>
  );
}

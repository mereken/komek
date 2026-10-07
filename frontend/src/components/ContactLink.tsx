import { formatPhone } from '../format';

/** Tap to call (phone) or write (e-mail). Shown only after the requester picked a runner. */
export default function ContactLink({ contact }: { contact: string | null }) {
  if (!contact) return null;
  const mail = contact.includes('@');
  return (
    <a className="contact" href={mail ? `mailto:${contact}` : `tel:${contact}`}>
      {mail ? '✉' : '☎'} {mail ? contact : formatPhone(contact)}
    </a>
  );
}

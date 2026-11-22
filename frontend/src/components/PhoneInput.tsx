import { formatNational, parsePhoneInput } from '../validation';

interface Props {
  id?: string;
  value: string; // the 10 national digits typed so far (without +7)
  onChange: (digits: string) => void;
  invalid?: boolean;
}

/** Phone field with the +7 (7XX) XXX-XX-XX template. Paste "8 701 234 56 78" or "+7 701 ..." and it fits. */
export default function PhoneInput({ id, value, onChange, invalid }: Props) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7 (700) 000-00-00"
      className={invalid ? 'invalid' : ''}
      value={formatNational(value)}
      onChange={(e) => onChange(parsePhoneInput(e.target.value, value))}
    />
  );
}

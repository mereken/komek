/** Shared input rules and formatters (the backend checks the same rules again). */

// ---- password
export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: 'len', label: 'Не короче 8 символов', test: (p) => p.length >= 8 },
  { id: 'letter', label: 'Есть буква', test: (p) => /\p{L}/u.test(p) },
  { id: 'digit', label: 'Есть цифра', test: (p) => /\d/.test(p) },
];

export const passwordOk = (p: string) => p.length <= 72 && PASSWORD_RULES.every((r) => r.test(p));

// ---- e-mail
export const isValidEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

// ---- phone: "+7 (7XX) XXX-XX-XX". The app keeps only the 10 national digits.
/** Kazakhstan numbers: after +7 comes a 6xx or 7xx code, 10 digits in total. */
export const isValidKzPhone = (digits: string) => /^[67]\d{9}$/.test(digits);

/** 10 national digits (or fewer while typing) -> "+7 (701) 234-56-78". Empty stays empty so the placeholder shows. */
export function formatNational(d: string): string {
  if (!d) return '';
  let out = '+7 (' + d.slice(0, 3);
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}

/**
 * What the user typed or pasted -> national digits. Understands "+7 701 ...", "8 701 ..." and "701 ...".
 * prev = the digits before this edit; used to make Backspace remove a digit when it hits a bracket or dash.
 */
export function parsePhoneInput(raw: string, prev: string): string {
  const text = raw.trim();
  let d = raw.replace(/\D/g, '');
  if (text.startsWith('+7')) d = d.slice(1); // the leading 7 is the country code
  else if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
  if (raw.length < formatNational(prev).length && d.length === prev.length) d = d.slice(0, -1);
  return d.slice(0, 10);
}

// ---- bank card (demo)
export const formatCardNumber = (raw: string) =>
  raw.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

/** "0828" -> "08/28" */
export function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function expiryError(expiry: string): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!m) return 'Срок действия в формате ММ/ГГ';
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return 'Неверный месяц';
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Срок действия карты истёк';
  return '';
}

export function cardErrors(number: string, expiry: string, cvc: string): string {
  if (number.replace(/\D/g, '').length !== 16) return 'Номер карты: 16 цифр';
  const e = expiryError(expiry);
  if (e) return e;
  if (!/^\d{3}$/.test(cvc)) return 'CVC: 3 цифры';
  return '';
}

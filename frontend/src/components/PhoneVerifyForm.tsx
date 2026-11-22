import { useEffect, useState } from 'react';
import { api, StartResponse, User } from '../api';
import { useAuth } from '../AuthContext';
import { formatPhone, formatTimer } from '../format';
import { isValidKzPhone } from '../validation';
import OtpInput from './OtpInput';
import PhoneInput from './PhoneInput';

/** Add or change the phone number: type the number, get a code, confirm it. */
export default function PhoneVerifyForm({ onDone, submitLabel = 'Сохранить номер' }: {
  onDone?: (u: User) => void;
  submitLabel?: string;
}) {
  const { updateUser } = useAuth();
  const [step, setStep] = useState<'enter' | 'code'>('enter');
  const [phone, setPhone] = useState(''); // 10 digits after +7
  const [info, setInfo] = useState<StartResponse | null>(null);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function sendCode() {
    if (!isValidKzPhone(phone)) { setError('Введите номер полностью: +7 (7XX) XXX-XX-XX'); return; }
    setError('');
    setBusy(true);
    try {
      const r = await api.phoneStart('+7' + phone);
      setInfo(r);
      setCode('');
      setLeft(r.resendInSeconds);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== 6) { setError('Введите 6 цифр'); return; }
    setError('');
    setBusy(true);
    try {
      const u = await api.phoneVerify(code);
      updateUser(u);
      onDone?.(u);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'enter') {
    return (
      <div>
        <div className="field">
          <label htmlFor="pv-phone">Номер телефона</label>
          <PhoneInput id="pv-phone" value={phone} invalid={!!error} onChange={(d) => { setPhone(d); setError(''); }} />
          {error && <div className="err">{error}</div>}
        </div>
        <button type="button" className="btn" disabled={busy} onClick={sendCode}>{busy ? 'Отправляем…' : 'Получить код'}</button>
      </div>
    );
  }

  return (
    <div>
      <p className="m">Код отправлен на {info ? formatPhone(info.contact) : ''}</p>
      <OtpInput value={code} invalid={!!error} onChange={(v) => { setCode(v); setError(''); }} />
      {error && <div className="err">{error}</div>}
      {info?.devCode && <div className="dev">Тестовый режим: код {info.devCode}</div>}
      <div className="actions-inline">
        <button type="button" className="btn" disabled={busy} onClick={confirm}>{busy ? 'Проверяем…' : submitLabel}</button>
        <button type="button" className="link" disabled={left > 0 || busy} onClick={sendCode}>
          {left > 0 ? `Отправить код ещё раз через ${formatTimer(left)}` : 'Отправить код ещё раз'}
        </button>
        <button type="button" className="link muted" onClick={() => { setStep('enter'); setError(''); }}>Изменить номер</button>
      </div>
    </div>
  );
}

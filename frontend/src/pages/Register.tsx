import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AuthResponse, Channel, Mode, StartResponse } from '../api';
import { useAuth } from '../AuthContext';
import { formatPhone, formatTimer } from '../format';
import OtpInput from '../components/OtpInput';
import PasswordInput from '../components/PasswordInput';
import PasswordRules from '../components/PasswordRules';
import PhoneInput from '../components/PhoneInput';
import Progress from '../components/Progress';
import Segmented from '../components/Segmented';
import { isValidEmail, isValidKzPhone, passwordOk } from '../validation';

export default function Register() {
  const { signIn } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<Channel>('PHONE');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState(''); // e-mail
  const [phone, setPhone] = useState(''); // 10 digits after +7
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; contact?: string; password?: string; password2?: string }>({});

  const [info, setInfo] = useState<StartResponse | null>(null);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0); // resend countdown, seconds

  const [auth, setAuth] = useState<AuthResponse | null>(null); // filled after the code is confirmed
  const [mode, setMode] = useState<Mode>('REQUESTER');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  // Runs an API call with shared busy/error handling. Returns true on success.
  async function run(action: () => Promise<void>): Promise<boolean> {
    setError('');
    setBusy(true);
    try {
      await action();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      const r = await api.startRegistration({
        fullName: fullName.trim(),
        channel,
        contact: channel === 'PHONE' ? '+7' + phone : contact.trim(),
        password,
      });
      setInfo(r);
      setCode('');
      setLeft(r.resendInSeconds);
      setStep(2);
    });

  const onDetails = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (fullName.trim().length < 2) errs.name = 'Введите имя (от 2 букв)';
    if (channel === 'PHONE' ? !isValidKzPhone(phone) : !isValidEmail(contact)) {
      errs.contact = channel === 'PHONE' ? 'Введите номер полностью: +7 (7XX) XXX-XX-XX' : 'Введите корректный e-mail, например adam@gmail.com';
    }
    if (!passwordOk(password)) errs.password = 'Пароль должен быть не короче 8 символов, с буквой и цифрой';
    if (password2 !== password) errs.password2 = 'Пароли не совпадают';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) { setError(''); return; }
    sendCode();
  };

  const onConfirm = () =>
    run(async () => {
      const a = await api.verify(info!.contact, code);
      localStorage.setItem('komek_token', a.token); // needed for the next request (set mode)
      setAuth(a);
      setStep(3);
    });

  const onFinish = () =>
    run(async () => {
      const user = await api.setMode(mode);
      signIn({ token: auth!.token, user }); // now the app redirects to the profile
    });

  const shownContact = info ? (channel === 'PHONE' ? formatPhone(info.contact) : info.contact) : '';

  // ---------- Step 1: details ----------
  if (step === 1) {
    return (
      <form className="screen" onSubmit={onDetails} noValidate>
        <div className="screen-body">
          <Progress step={1} />
          <h1 className="title">Создайте аккаунт</h1>
          <p className="sub">Займёт меньше минуты.</p>

          <Segmented<Channel>
            options={[{ value: 'PHONE', label: 'Телефон' }, { value: 'EMAIL', label: 'E-mail' }]}
            value={channel}
            onChange={(c) => { setChannel(c); setContact(''); setPhone(''); setFieldErrors({}); setError(''); }}
          />

          <div className="field">
            <label htmlFor="name">Имя</label>
            <input id="name" autoComplete="given-name" maxLength={100} placeholder="Адам" value={fullName}
                   className={fieldErrors.name ? 'invalid' : ''} onChange={(e) => setFullName(e.target.value)} />
            {fieldErrors.name && <div className="err">{fieldErrors.name}</div>}
          </div>

          <div className="field">
            <label htmlFor="contact">{channel === 'PHONE' ? 'Номер телефона' : 'E-mail'}</label>
            {channel === 'PHONE' ? (
              <PhoneInput id="contact" value={phone} invalid={!!fieldErrors.contact} onChange={setPhone} />
            ) : (
              <input id="contact" type="email" autoComplete="email" placeholder="adam@gmail.com"
                     className={fieldErrors.contact ? 'invalid' : ''}
                     value={contact} onChange={(e) => setContact(e.target.value)} />
            )}
            {fieldErrors.contact && <div className="err">{fieldErrors.contact}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Пароль</label>
            <PasswordInput id="password" autoComplete="new-password" maxLength={72} placeholder="Минимум 8 символов"
                           invalid={!!fieldErrors.password} value={password} onChange={setPassword} />
            <PasswordRules value={password} />
            {fieldErrors.password && <div className="err">{fieldErrors.password}</div>}
          </div>

          <div className="field">
            <label htmlFor="password2">Повторите пароль</label>
            <PasswordInput id="password2" autoComplete="new-password" maxLength={72} placeholder="Ещё раз пароль"
                           invalid={!!fieldErrors.password2} value={password2} onChange={setPassword2} />
            {fieldErrors.password2 && <div className="err">{fieldErrors.password2}</div>}
          </div>

          {error && <div className="err">{error}</div>}
        </div>

        <div className="footer">
          <button className="btn" disabled={busy}>{busy ? 'Отправляем…' : 'Получить код'}</button>
          <div className="foot">Уже есть аккаунт? <Link to="/login">Войти</Link></div>
        </div>
      </form>
    );
  }

  // ---------- Step 2: code ----------
  if (step === 2) {
    return (
      <div className="screen">
        <div className="screen-body">
          <Progress step={2} />
          <h1 className="title">{channel === 'PHONE' ? 'Введите код из SMS' : 'Введите код'}</h1>
          <p className="sub">Отправили на {shownContact}</p>

          <OtpInput value={code} onChange={setCode} invalid={!!error} />
          {error && <div className="err spaced-top">{error}</div>}

          <div className="hint spaced-top">
            {left > 0 ? (
              <>Отправить снова через {formatTimer(left)}</>
            ) : (
              <button type="button" className="link" disabled={busy} onClick={sendCode}>Отправить код снова</button>
            )}
          </div>

          {info?.devCode && (
            <div className="dev">Тестовый режим: SMS и почта пока не подключены. Ваш код — <b>{info.devCode}</b></div>
          )}
        </div>

        <div className="footer">
          <button className="btn" disabled={busy || code.length < 6} onClick={onConfirm}>
            {busy ? 'Проверяем…' : 'Подтвердить'}
          </button>
          <button type="button" className="link center-link" onClick={() => { setStep(1); setError(''); }}>
            {channel === 'PHONE' ? 'Изменить номер' : 'Изменить e-mail'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Step 3: mode ----------
  return (
    <div className="screen">
      <div className="screen-body">
        <Progress step={3} />
        <h1 className="title">Что хотите делать?</h1>
        <p className="sub">Режим можно сменить в любой момент в профиле.</p>

        <button type="button" className={'choice' + (mode === 'REQUESTER' ? ' on' : '')} onClick={() => setMode('REQUESTER')}>
          <span className="ico">+</span>
          <span>
            <b>Нужна помощь</b>
            <span className="d">Публикую задания и выбираю исполнителя</span>
          </span>
        </button>

        <button type="button" className={'choice' + (mode === 'RUNNER' ? ' on' : '')} onClick={() => setMode('RUNNER')}>
          <span className="ico">₸</span>
          <span>
            <b>Хочу зарабатывать</b>
            <span className="d">Беру задания рядом и получаю оплату</span>
          </span>
        </button>

        {error && <div className="err">{error}</div>}
      </div>

      <div className="footer">
        <button className="btn" disabled={busy} onClick={onFinish}>{busy ? 'Сохраняем…' : 'Продолжить'}</button>
      </div>
    </div>
  );
}

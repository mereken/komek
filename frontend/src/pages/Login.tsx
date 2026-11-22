import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';
import { formatNational, isValidEmail, parsePhoneInput } from '../validation';

/** The field switches to the +7 mask when it starts with + / 6 / 7 / 8 and has no letters or @; otherwise it is an e-mail. */
const PHONE_START = /^\s*[+678]/;
const HAS_LETTERS = /[A-Za-zА-Яа-яЁё@]/;

export default function Login() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  function onLoginChange(raw: string) {
    if (!PHONE_START.test(raw) || HAS_LETTERS.test(raw)) { setLogin(raw); return; }
    const prev = login.trim().startsWith('+7') ? login.replace(/\D/g, '').slice(1) : login.replace(/\D/g, '');
    setLogin(formatNational(parsePhoneInput(raw, prev)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    const value = login.trim();
    const isEmail = value.includes('@');
    // any complete +7 number is accepted here, so older accounts keep working
    if (!value || (isEmail ? !isValidEmail(value) : parsePhoneInput(value, '').length !== 10)) {
      setError('Введите номер полностью (+7 700 000 00 00) или e-mail');
      return;
    }
    if (!password) {
      setError('Введите пароль');
      return;
    }

    setBusy(true);
    try {
      signIn(await api.login(value, password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={onSubmit} noValidate>
      <div className="screen-body">
        <Logo />
        <h1 className="title spaced">С возвращением</h1>
        <p className="sub">Войдите, чтобы увидеть свои задания.</p>

        <div className="field">
          <label htmlFor="login">Телефон или e-mail</label>
          <input id="login" autoComplete="username" inputMode="email" placeholder="+7 (700) 000-00-00 или e-mail" value={login}
                 className={error && !password ? 'invalid' : ''} onChange={(e) => onLoginChange(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="введите пароль"
                         invalid={!!error} value={password} onChange={setPassword} />
          {error && <div className="err">{error}</div>}
        </div>

        <button type="button" className="link forgot" onClick={() => setInfo('Сброс пароля появится в одной из следующих версий.')}>
          Забыли пароль?
        </button>
        {info && <div className="hint right">{info}</div>}
      </div>

      <div className="footer">
        <button className="btn" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
        <div className="foot">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></div>
      </div>
    </form>
  );
}

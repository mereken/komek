import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';
import { isValidEmail } from '../validation';

export default function Login() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    const value = login.trim();
    const digits = value.replace(/\D/g, '');
    const looksLikeEmail = value.includes('@');
    if (!value || (looksLikeEmail ? !isValidEmail(value) : digits.length < 10 || digits.length > 11)) {
      setError('Введите номер телефона (+7 700 000 00 00) или e-mail');
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
          <input id="login" autoComplete="username" placeholder="+7 700 000 00 00 или e-mail" value={login}
                 onChange={(e) => setLogin(e.target.value)} />
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

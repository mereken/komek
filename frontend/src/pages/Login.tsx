import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Logo from '../components/Logo';

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
    setBusy(true);
    try {
      signIn(await api.login(login, password));
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
          <input id="login" autoComplete="username" placeholder="+7 xxx-xxx-xxxx" value={login}
                 onChange={(e) => setLogin(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="введите пароль"
                 className={error ? 'invalid' : ''} value={password}
                 onChange={(e) => setPassword(e.target.value)} />
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

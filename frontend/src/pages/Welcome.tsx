import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Welcome() {
  return (
    <div className="screen">
      <div className="screen-body">
        <Logo />

        <div className="hero">
          <div className="pin">
            <svg width="42" height="52" viewBox="0 0 48 60" aria-hidden="true">
              <path d="M24 0C10.7 0 0 10.7 0 24c0 17 24 36 24 36s24-19 24-36C48 10.7 37.3 0 24 0z" fill="#F2B233" />
            </svg>
          </div>
          <h2>Поручите дело.<br />Займитесь своим.</h2>
          <p>Очередь, посылка, прогулка с собакой</p>
        </div>

        <h1 className="title">Помощь рядом, в Алматы</h1>
        <p className="sub">Публикуйте задания или зарабатывайте, выполняя чужие.</p>
      </div>

      <div className="footer">
        <Link className="btn" to="/register">Создать аккаунт</Link>
        <Link className="btn outline" to="/login">Войти</Link>
      </div>
    </div>
  );
}

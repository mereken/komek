import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Mode } from '../api';
import { useAuth } from '../AuthContext';
import { formatPhone, pointsText } from '../format';
import Avatar from '../components/Avatar';
import Segmented from '../components/Segmented';

function RatingChip({ label, rating, count }: { label: string; rating: number | null; count: number }) {
  return (
    <div className="rchip">
      <span className="k">{label}</span>
      {rating != null ? <b>★ {rating} <small>· {count}</small></b> : <b className="none">нет оценок</b>}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const [error, setError] = useState('');

  // The sign-in response has no ratings, so refresh the profile when the screen opens.
  useEffect(() => {
    api.me().then(updateUser).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const changeMode = async (m: Mode) => {
    if (m === user.mode) return;
    setError('');
    try {
      updateUser(await api.setMode(m));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <h1 className="title">Профиль</h1>

      <div className="pcard">
        <Avatar name={user.fullName} url={user.avatarUrl} size="xl" />
        <b className="pname">{user.fullName}</b>
        <div className="m">{user.phone ? formatPhone(user.phone) : user.email}</div>
        <div className="rchips">
          <RatingChip label="Как исполнитель" rating={user.rating} count={user.ratingCount} />
          <RatingChip label="Как заказчик" rating={user.requesterRating} count={user.requesterRatingCount} />
        </div>
      </div>

      <Link to="/wallet" className="wallet-link">
        <div>
          <span className="k">Кошелёк</span>
          <b>{pointsText(user.balance)}</b>
        </div>
        <span className="chev">›</span>
      </Link>

      <div className="label">Режим</div>
      <Segmented<Mode>
        options={[{ value: 'REQUESTER', label: 'Заказчик' }, { value: 'RUNNER', label: 'Исполнитель' }]}
        value={user.mode}
        onChange={changeMode}
      />
      {error && <div className="err">{error}</div>}

      <div className="menu">
        <Link to="/profile/edit"><span>Редактировать профиль</span><span className="chev">›</span></Link>
        <Link to="/wallet"><span>Кошелёк и банковская карта</span><span className="chev">›</span></Link>
        {user.admin && <Link to="/admin"><span>Админ-панель</span><span className="chev">›</span></Link>}
      </div>

      <div className="actions">
        <button type="button" className="btn outline" onClick={signOut}>Выйти</button>
      </div>
    </>
  );
}

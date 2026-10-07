import { useEffect, useState } from 'react';
import { api, Mode } from '../api';
import { useAuth } from '../AuthContext';
import { formatPhone } from '../format';
import Segmented from '../components/Segmented';

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const [error, setError] = useState('');

  // The sign-in response has no rating, so refresh the profile when the screen opens.
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

      <div className="card who">
        <div className="avatar">{user.fullName.trim().charAt(0).toUpperCase()}</div>
        <div>
          <b>{user.fullName}</b>
          <div className="m">{user.phone ? formatPhone(user.phone) : user.email}</div>
        </div>
      </div>

      <div className="rating-line">
        {user.rating != null ? <>★ {user.rating} <span className="muted-inline">· оценок: {user.ratingCount}</span></> : <span className="muted-inline">Пока нет оценок</span>}
      </div>

      <div className="label">Режим</div>
      <Segmented<Mode>
        options={[{ value: 'REQUESTER', label: 'Заказчик' }, { value: 'RUNNER', label: 'Исполнитель' }]}
        value={user.mode}
        onChange={changeMode}
      />
      {error && <div className="err">{error}</div>}

      <div className="actions">
        <button type="button" className="btn outline" onClick={signOut}>Выйти</button>
      </div>
    </>
  );
}

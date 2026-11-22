import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import BackButton from '../components/BackButton';
import PhoneVerifyForm from '../components/PhoneVerifyForm';
import PasswordInput from '../components/PasswordInput';
import PasswordRules from '../components/PasswordRules';
import { formatPhone } from '../format';
import { passwordOk } from '../validation';

/** Crops the photo to a centered square, shrinks it to 256x256 and returns a small JPEG as a data URL. */
async function toAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите файл с изображением');
  if (file.size > 15 * 1024 * 1024) throw new Error('Файл слишком большой (до 15 МБ)');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Не удалось открыть фото. Попробуйте JPG или PNG.'));
      i.src = url;
    });
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Не удалось обработать фото');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.fullName ?? '');
  const [nameMsg, setNameMsg] = useState('');
  const [nameErr, setNameErr] = useState('');

  const [changingPhone, setChangingPhone] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  if (!user) return null;

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be chosen again
    if (!file) return;
    setPhotoErr('');
    setPhotoBusy(true);
    try {
      updateUser(await api.setAvatar(await toAvatarDataUrl(file)));
    } catch (err) {
      setPhotoErr((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoErr('');
    setPhotoBusy(true);
    try {
      updateUser(await api.removeAvatar());
    } catch (err) {
      setPhotoErr((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg('');
    setNameErr('');
    if (name.trim().length < 2) { setNameErr('Введите имя (от 2 букв)'); return; }
    try {
      updateUser(await api.updateProfile(name.trim()));
      setNameMsg('Имя сохранено');
    } catch (err) {
      setNameErr((err as Error).message);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    if (!current) { setPwErr('Введите текущий пароль'); return; }
    if (!passwordOk(next)) { setPwErr('Новый пароль: не короче 8 символов, с буквой и цифрой'); return; }
    if (next !== next2) { setPwErr('Новые пароли не совпадают'); return; }
    setPwBusy(true);
    try {
      await api.changePassword(current, next);
      setPwMsg('Пароль изменён');
      setCurrent('');
      setNext('');
      setNext2('');
    } catch (err) {
      setPwErr((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <>
      <BackButton fallback="/profile" />
      <h1 className="title">Редактировать профиль</h1>

      <div className="photo-edit">
        <Avatar name={user.fullName} url={user.avatarUrl} size="xl" />
        <div className="photo-actions">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
          <button type="button" className="btn small" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            {photoBusy ? 'Загружаем…' : user.avatarUrl ? 'Сменить фото' : 'Добавить фото'}
          </button>
          {user.avatarUrl && (
            <button type="button" className="link danger" disabled={photoBusy} onClick={removePhoto}>Удалить фото</button>
          )}
        </div>
      </div>
      {photoErr && <div className="err">{photoErr}</div>}

      <form onSubmit={saveName} noValidate>
        <div className="field">
          <label htmlFor="pname">Имя</label>
          <input id="pname" maxLength={100} value={name} className={nameErr ? 'invalid' : ''}
                 onChange={(e) => { setName(e.target.value); setNameMsg(''); }} />
          {nameErr && <div className="err">{nameErr}</div>}
          {nameMsg && <div className="ok-text">{nameMsg}</div>}
        </div>
        <button className="btn" disabled={name.trim() === user.fullName}>Сохранить имя</button>
      </form>

      <div className="section strong">Телефон</div>
      <div className="card">
        {user.phone ? <b>{formatPhone(user.phone)}</b> : <div className="m">Номер не указан. Он нужен, чтобы создавать заказы и откликаться.</div>}
        {user.email && <div className="m">E-mail: {user.email}</div>}
        {changingPhone ? (
          <PhoneVerifyForm onDone={() => setChangingPhone(false)} />
        ) : (
          <button type="button" className="link" onClick={() => setChangingPhone(true)}>
            {user.phone ? 'Изменить номер' : 'Добавить номер'}
          </button>
        )}
      </div>

      <div className="section strong">Сменить пароль</div>
      <form onSubmit={savePassword} noValidate>
        <div className="field">
          <label htmlFor="cur">Текущий пароль</label>
          <PasswordInput id="cur" autoComplete="current-password" value={current} onChange={setCurrent} />
        </div>
        <div className="field">
          <label htmlFor="new1">Новый пароль</label>
          <PasswordInput id="new1" autoComplete="new-password" maxLength={72} value={next} onChange={setNext} />
          <PasswordRules value={next} />
        </div>
        <div className="field">
          <label htmlFor="new2">Повторите новый пароль</label>
          <PasswordInput id="new2" autoComplete="new-password" maxLength={72} value={next2} onChange={setNext2} />
        </div>
        {pwErr && <div className="err">{pwErr}</div>}
        {pwMsg && <div className="ok-text">{pwMsg}</div>}
        <button className="btn" disabled={pwBusy}>{pwBusy ? 'Сохраняем…' : 'Сменить пароль'}</button>
      </form>
    </>
  );
}

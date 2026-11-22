import type { User } from '../api';
import Modal from './Modal';
import PhoneVerifyForm from './PhoneVerifyForm';

/** Shown when someone without a phone number tries to create an order or respond to one. */
export default function PhoneGateModal({ onClose, onDone }: { onClose: () => void; onDone: (u: User) => void }) {
  return (
    <Modal title="Добавьте номер телефона" onClose={onClose}>
      <p className="m modal-text">Заказчик и исполнитель связываются по телефону. Номер увидит только вторая сторона заказа после выбора исполнителя.</p>
      <PhoneVerifyForm onDone={onDone} submitLabel="Подтвердить номер" />
    </Modal>
  );
}

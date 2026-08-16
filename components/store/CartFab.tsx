'use client';
import Icon from '@/components/Icon';
import { useCart } from './CartContext';

// ─────────────────────────────────────────────────────────────────────────────
// Botón flotante del carrito (esquina inferior izquierda)
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onOpen: () => void;
}

export default function CartFab({ onOpen }: Props) {
  const { count } = useCart();

  return (
    <button
      type="button"
      className={'cart-fab' + (count > 0 ? ' has-items' : '')}
      onClick={onOpen}
      aria-label={`Abrir carrito (${count} ítems)`}
    >
      <Icon name="cart" style={{ width: 22, height: 22 }} />
      {count > 0 && <span className="cart-fab__badge">{count > 99 ? '99+' : count}</span>}
    </button>
  );
}

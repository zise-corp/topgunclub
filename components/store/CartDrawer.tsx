'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/store-types';
import { waLink } from '@/lib/site';
import Icon from '@/components/Icon';
import { useCart } from './CartContext';

// ─────────────────────────────────────────────────────────────────────────────
// Drawer del carrito + checkout por WhatsApp (registra el pedido en la DB)
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

type SendState = 'idle' | 'sending' | 'done' | 'error';

export default function CartDrawer({ open, onClose }: Props) {
  const { items, count, total, updateQty, remove, clear } = useCart();
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setState('idle');
      setErrorMsg('');
    }
  }, [open]);

  const buildMessage = (orderNumber: number | null) => {
    const lines: string[] = [];
    lines.push('🛒 *NUEVO PEDIDO — TOP GUN CLUB*');
    if (orderNumber) lines.push(`📋 N° ${orderNumber}`);
    lines.push('');
    items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.name} ×${it.qty} — ${formatPrice(it.price * it.qty)}`);
    });
    lines.push('');
    lines.push(`*TOTAL: ${formatPrice(total)}*`);
    if (customer.trim()) lines.push(`\n👤 ${customer.trim()}`);
    if (phone.trim()) lines.push(`📱 ${phone.trim()}`);
    if (note.trim()) lines.push(`📝 ${note.trim()}`);
    lines.push('\nGracias por tu compra! 🎯');
    return lines.join('\n');
  };

  const handleSend = async () => {
    if (items.length === 0) return;
    if (customer.trim().length < 2) {
      setErrorMsg('Ingresá tu nombre para enviar el pedido');
      setState('error');
      return;
    }

    setState('sending');
    setErrorMsg('');

    let orderNumber: number | null = null;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customer.trim(),
          phone: phone.trim(),
          note: note.trim(),
          items: items.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            qty: it.qty,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { order?: { number?: number } };
        orderNumber = data.order?.number ?? null;
      }
    } catch {
      // sin conexión: igual se abre WhatsApp (la venta no se pierde)
    }

    const msg = buildMessage(orderNumber);
    window.open(waLink(msg), '_blank', 'noopener,noreferrer');

    clear();
    setCustomer('');
    setPhone('');
    setNote('');
    setState('done');
  };

  return (
    <>
      <div
        className={'cart-drawer-overlay' + (open ? ' open' : '')}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={'cart-drawer' + (open ? ' open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        <header className="cart-drawer__head">
          <h3>
            <Icon name="cart" style={{ width: 20, height: 20 }} /> Tu carrito{' '}
            {count > 0 && <span className="cart-drawer__count">{count}</span>}
          </h3>
          <button type="button" className="cart-drawer__x" onClick={onClose} aria-label="Cerrar carrito">
            <Icon name="close" style={{ width: 18, height: 18 }} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <Icon name="cart" style={{ width: 44, height: 44, opacity: 0.4 }} />
            <p>Tu carrito está vacío.</p>
            <small>Agregá productos desde la tienda.</small>
          </div>
        ) : (
          <>
            <div className="cart-drawer__list">
              {items.map((it) => (
                <div key={it.productId} className="cart-item">
                  <div className="cart-item__img">
                    {it.image ? (
                      <Image src={it.image} alt={it.name} fill sizes="64px" style={{ objectFit: 'cover' }} unoptimized />
                    ) : (
                      <Icon name="image" style={{ width: 22, height: 22, opacity: 0.4 }} />
                    )}
                  </div>
                  <div className="cart-item__info">
                    <b>{it.name}</b>
                    <span>{formatPrice(it.price)}</span>
                    <div className="cart-item__row">
                      <div className="store-qty store-qty--sm">
                        <button type="button" onClick={() => updateQty(it.productId, it.qty - 1)} aria-label="Menos">
                          <Icon name="minus" style={{ width: 12, height: 12 }} />
                        </button>
                        <span>{it.qty}</span>
                        <button type="button" onClick={() => updateQty(it.productId, it.qty + 1)} aria-label="Más">
                          <Icon name="plus" style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item__del"
                        onClick={() => remove(it.productId)}
                        aria-label={`Quitar ${it.name}`}
                      >
                        <Icon name="trash" style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                  <b className="cart-item__total">{formatPrice(it.price * it.qty)}</b>
                </div>
              ))}
            </div>

            <div className="cart-drawer__checkout">
              <div className="cart-drawer__subtotal">
                <span>
                  Subtotal ({count} ítem{count !== 1 ? 's' : ''})
                </span>
                <b>{formatPrice(total)}</b>
              </div>

              <label className="field">
                <span>Tu nombre *</span>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Nombre y apellido"
                  maxLength={120}
                />
              </label>
              <label className="field">
                <span>WhatsApp / Teléfono</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 7XXXXXXXX (opcional)"
                  maxLength={40}
                />
              </label>
              <label className="field">
                <span>Nota</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Algún detalle de tu pedido (opcional)"
                  rows={2}
                  maxLength={1000}
                />
              </label>

              {state === 'error' && errorMsg && <p className="cart-drawer__error">{errorMsg}</p>}
              {state === 'done' && (
                <p className="cart-drawer__ok">
                  Pedido preparado ✓ Se abrió WhatsApp con tu mensaje. ¡Gracias!
                </p>
              )}

              <button
                type="button"
                className="btn btn--wa btn--lg btn--block"
                onClick={handleSend}
                disabled={state === 'sending'}
              >
                {state === 'sending' ? (
                  'Enviando…'
                ) : (
                  <>
                    <Icon name="whatsapp" style={{ width: 19, height: 19 }} />
                    Confirmar pedido por WhatsApp
                  </>
                )}
              </button>
              <p className="cart-drawer__hint">
                Tu pedido se registra y se envía a nuestro WhatsApp para confirmar stock y entrega.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

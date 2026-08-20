'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { formatPrice } from '@/lib/store-types';
import { waLink } from '@/lib/site';
import Icon from '@/components/Icon';
import { REGIONS, isLocalRegion, isValidMapsUrl } from '@/lib/delivery';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useCart } from './CartContext';
import type { LocationValue } from './LocationPicker';

// Leaflet toca `window` al importarse: solo en cliente, y así no pesa en el
// bundle de quienes eligen retiro en local.
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => <p className="loc-picker__hint">Cargando mapa…</p>,
});

// ─────────────────────────────────────────────────────────────────────────────
// Drawer del carrito + checkout por WhatsApp (registra el pedido en la DB)
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

type SendState = 'idle' | 'sending' | 'done' | 'error';
type DeliveryMethod = 'pickup' | 'delivery';

const EMPTY_LOCATION: LocationValue = { lat: null, lng: null, mapsUrl: '' };

export default function CartDrawer({ open, onClose }: Props) {
  const { items, count, total, updateQty, remove, clear } = useCart();
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [ci, setCi] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isDelivery = deliveryMethod === 'delivery';
  const isLocal = isDelivery && isLocalRegion(region);

  // El fondo no debe scrollear detrás del carrito abierto.
  useScrollLock(open);

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

  const buildMessage = (orderNumber: number | null, orderId: string | null) => {
    const lines: string[] = [];
    lines.push('🛒 *NUEVO PEDIDO — TOP GUN CLUB*');
    if (orderNumber) lines.push(`📋 N° ${orderNumber}`);
    // Link al recibo: WhatsApp genera automáticamente una vista previa con la
    // imagen del pedido (ver app/pedido/[id]/opengraph-image.tsx) — sin adjuntar
    // nada a mano, el mensaje llega con el resumen visual.
    if (orderId) lines.push(`🧾 https://topgunclub.com.bo/pedido/${orderId}`);
    lines.push('');
    items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.name} ×${it.qty} — ${formatPrice(it.price * it.qty)}`);
    });
    lines.push('');
    lines.push(`*TOTAL: ${formatPrice(total)}*`);
    if (customer.trim()) lines.push(`\n👤 ${customer.trim()}`);
    if (phone.trim()) lines.push(`📱 ${phone.trim()}`);

    if (isDelivery) {
      lines.push(`\n🚚 *ENVÍO A DOMICILIO* — ${region}`);
      if (isLocal) {
        if (address.trim()) lines.push(`🏠 ${address.trim()}`);
        if (location.mapsUrl) lines.push(`📍 ${location.mapsUrl}`);
      } else {
        if (ci.trim()) lines.push(`🪪 CI: ${ci.trim()}`);
        if (email.trim()) lines.push(`✉️ ${email.trim()}`);
      }
    } else {
      lines.push('\n🏬 *RETIRO EN EL LOCAL*');
    }

    if (note.trim()) lines.push(`📝 ${note.trim()}`);
    lines.push('\nGracias por tu compra! 🎯');
    return lines.join('\n');
  };

  /** Devuelve el primer error de validación, o null si está todo OK. */
  const validate = (): string | null => {
    if (customer.trim().length < 2) return 'Ingresá tu nombre para enviar el pedido';
    if (phone.trim().replace(/\D/g, '').length < 6) return 'Ingresá un teléfono válido';
    if (!isDelivery) return null;

    if (!region) return 'Elegí el departamento de entrega';
    if (isLocal) {
      if (address.trim().length < 5) return 'Escribí tu dirección de entrega';
      const hasCoords = location.lat != null && location.lng != null;
      const hasUrl = !!location.mapsUrl.trim() && isValidMapsUrl(location.mapsUrl);
      if (!hasCoords && !hasUrl) {
        return 'Compartí tu ubicación en el mapa o pegá un link de Google Maps válido';
      }
      return null;
    }
    if (ci.trim().length < 4) return 'Ingresá tu número de CI';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingresá un correo válido';
    return null;
  };

  // Paso 1: valida y abre el modal de confirmación.
  const handleConfirmClick = () => {
    if (items.length === 0) return;
    const err = validate();
    if (err) {
      setErrorMsg(err);
      setState('error');
      return;
    }
    setErrorMsg('');
    setConfirming(true);
  };

  // Paso 2: el usuario confirmó en el modal — se registra y se arma WhatsApp.
  const handleSend = async () => {
    setConfirming(false);
    setState('sending');
    setErrorMsg('');
    setWaUrl(null);

    let orderNumber: number | null = null;
    let orderId: string | null = null;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customer.trim(),
          phone: phone.trim(),
          note: note.trim(),
          deliveryMethod,
          region: isDelivery ? region : null,
          address: isLocal ? address.trim() : null,
          locationLat: isLocal ? location.lat : null,
          locationLng: isLocal ? location.lng : null,
          locationMapsUrl: isLocal ? location.mapsUrl.trim() || null : null,
          ci: isDelivery && !isLocal ? ci.trim() : null,
          email: isDelivery && !isLocal ? email.trim() : null,
          items: items.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            qty: it.qty,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { order?: { number?: number; id?: string } };
        orderNumber = data.order?.number ?? null;
        orderId = data.order?.id ?? null;
      }
    } catch {
      // sin conexión: igual se abre WhatsApp (la venta no se pierde)
    }

    const url = waLink(buildMessage(orderNumber, orderId));
    setWaUrl(url);

    // Intento automático: funciona en algunos navegadores/config, pero no es
    // confiable (los bloqueadores de popup varían mucho entre navegadores y
    // pueden fallar en silencio). Por eso el botón "Enviar por WhatsApp" de
    // abajo se muestra siempre — es un clic real y directo del usuario, así
    // que ningún bloqueador de popups puede impedirlo.
    window.open(url, '_blank', 'noopener,noreferrer');

    clear();
    setCustomer('');
    setPhone('');
    setNote('');
    setDeliveryMethod('pickup');
    setRegion('');
    setAddress('');
    setLocation(EMPTY_LOCATION);
    setCi('');
    setEmail('');
    setState('done');
  };

  return (
    <>
      <div
        className={'cart-drawer-overlay' + (open ? ' open' : '')}
        onClick={onClose}
        aria-hidden={!open}
        data-native-cursor
      />
      <aside
        className={'cart-drawer' + (open ? ' open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        data-native-cursor
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

        {/* Fuera del if de items vacíos/con productos: el carrito ya se vació acá
            arriba (clear()), así que este aviso debe seguir visible igual.
            El botón se muestra siempre (no solo si el auto-open "falló"): es
            un clic directo del usuario, así que siempre funciona, sin
            depender de si el navegador dejó abrir la ventana automática. */}
        {state === 'done' && waUrl && (
          <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="cart-drawer__ok" style={{ margin: 0 }}>
              Pedido preparado ✓ Tocá el botón para enviarlo por WhatsApp.
            </p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn--wa btn--block">
              <Icon name="whatsapp" style={{ width: 19, height: 19 }} /> Enviar por WhatsApp
            </a>
          </div>
        )}

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
                <span>WhatsApp / Teléfono *</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 7XXXXXXXX"
                  maxLength={40}
                />
              </label>
              {/* ── ¿Cómo recibe el pedido? ── */}
              <div className="field">
                <span>¿Cómo querés recibir tu pedido? *</span>
                <div className="deliv-switch" role="radiogroup" aria-label="Método de entrega">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!isDelivery}
                    className={'deliv-switch__opt' + (!isDelivery ? ' active' : '')}
                    onClick={() => setDeliveryMethod('pickup')}
                  >
                    <Icon name="package" style={{ width: 18, height: 18 }} />
                    Retiro en el local
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isDelivery}
                    className={'deliv-switch__opt' + (isDelivery ? ' active' : '')}
                    onClick={() => setDeliveryMethod('delivery')}
                  >
                    <Icon name="pin" style={{ width: 18, height: 18 }} />
                    Envío a domicilio
                  </button>
                </div>
              </div>

              {isDelivery && (
                <>
                  <label className="field">
                    <span>Departamento *</span>
                    <select value={region} onChange={(e) => setRegion(e.target.value)}>
                      <option value="">Elegí tu departamento…</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>

                  {isLocal && (
                    <>
                      <label className="field">
                        <span>Dirección *</span>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Calle, número, zona y referencias (ej. Av. Blanco Galindo #123, entre 2do y 3er anillo, portón verde)"
                          rows={2}
                          maxLength={300}
                        />
                      </label>
                      <LocationPicker value={location} onChange={setLocation} />
                    </>
                  )}

                  {region && !isLocal && (
                    <>
                      <label className="field">
                        <span>CI (Carnet de identidad) *</span>
                        <input
                          value={ci}
                          onChange={(e) => setCi(e.target.value)}
                          placeholder="Ej: 1234567 CB"
                          maxLength={30}
                        />
                      </label>
                      <label className="field">
                        <span>Correo electrónico *</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tucorreo@ejemplo.com"
                          maxLength={200}
                        />
                      </label>
                      <p className="cart-drawer__hint" style={{ textAlign: 'left', marginTop: 0 }}>
                        Para envíos fuera de Cochabamba coordinamos el transporte por WhatsApp.
                      </p>
                    </>
                  )}
                </>
              )}

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

              <button
                type="button"
                className="btn btn--wa btn--lg btn--block"
                onClick={handleConfirmClick}
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

      {confirming && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmar pedido" data-native-cursor>
          <button type="button" className="confirm-modal__backdrop" onClick={() => setConfirming(false)} aria-label="Cancelar" />
          <div className="confirm-modal__panel">
            <h4>¿Confirmás tu pedido?</h4>
            <p>
              {count} ítem{count !== 1 ? 's' : ''} · <b>{formatPrice(total)}</b>
              <br />
              {isDelivery ? `Envío a domicilio — ${region}` : 'Retiro en el local'}
            </p>
            <div className="confirm-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
                Volver
              </button>
              <button type="button" className="btn btn--wa" onClick={handleSend}>
                <Icon name="whatsapp" style={{ width: 18, height: 18 }} /> Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

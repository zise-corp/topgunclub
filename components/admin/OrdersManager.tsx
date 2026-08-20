'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderDTO } from '@/lib/store-types';
import { formatPrice } from '@/lib/store-types';
import Icon from '@/components/Icon';
import { STATUS_LABELS, STATUS_ORDER } from './order-status';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de pedidos: listado de pedidos (ventas por WhatsApp) y cambio de estado
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdersManager() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('todos');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Sin autorización');
      const data = (await res.json()) as { orders: OrderDTO[] };
      setOrders(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (order: OrderDTO, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        setError('No se pudo actualizar el estado');
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      setError('Error de red al actualizar');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'todos' && o.status !== filter) return false;
      if (!q) return true;
      return (
        String(o.number).includes(q) ||
        (o.customer ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').toLowerCase().includes(q) ||
        (o.region ?? '').toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
      );
    });
  }, [orders, filter, query]);

  if (loading && orders.length === 0) {
    return <div className="admin-skeleton-grid">{[0, 1, 2].map((i) => <div key={i} className="admin-skeleton" />)}</div>;
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2>Pedidos</h2>
          <p>Ventas registradas desde el carrito de la tienda (confirmadas por WhatsApp).</p>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {orders.length > 0 && (
        <label className="admin-search admin-search--wide">
          <Icon name="search" style={{ width: 16, height: 16 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por N°, cliente, teléfono o producto…"
            aria-label="Buscar pedidos"
          />
        </label>
      )}

      <div className="admin-chips">
        <button
          type="button"
          className={'admin-chip' + (filter === 'todos' ? ' active' : '')}
          onClick={() => setFilter('todos')}
        >
          Todos ({orders.length})
        </button>
        {STATUS_ORDER.map((s) => {
          const n = orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              type="button"
              className={'admin-chip' + (filter === s ? ' active' : '')}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABELS[s]} ({n})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <Icon name="cart" style={{ width: 34, height: 34, opacity: 0.35 }} />
          <p>
            {orders.length === 0
              ? 'Todavía no hay pedidos. Aparecerán acá cuando alguien compre en la tienda.'
              : 'Ningún pedido coincide con la búsqueda.'}
          </p>
          {orders.length > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setFilter('todos'); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="admin-orders">
          {filtered.map((o) => (
            <article key={o.id} className="admin-order">
              <header className="admin-order__head">
                <div className="admin-order__id">
                  <span className="admin-order__num">#{o.number}</span>
                  <span>
                    <b>{o.customer ?? 'Sin nombre'}</b>
                    <small>
                      {new Date(o.createdAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </small>
                  </span>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => changeStatus(o, e.target.value)}
                  className={'admin-status admin-status--' + o.status}
                  aria-label={`Estado del pedido ${o.number}`}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </header>

              <div className="admin-order__items">
                {o.items.map((it) => (
                  <div key={it.id} className="admin-order__item">
                    <span>{it.name} <em>×{it.qty}</em></span>
                    <span>{formatPrice(it.price * it.qty, o.currency)}</span>
                  </div>
                ))}
              </div>

              {/* Entrega: lo que el repartidor necesita saber */}
              <div className={'admin-order__delivery' + (o.deliveryMethod === 'delivery' ? ' is-delivery' : '')}>
                <span className="admin-order__deltitle">
                  <Icon name={o.deliveryMethod === 'delivery' ? 'pin' : 'package'} style={{ width: 15, height: 15 }} />
                  {o.deliveryMethod === 'delivery'
                    ? `Envío a domicilio${o.region ? ` · ${o.region}` : ''}`
                    : 'Retiro en el local'}
                </span>
                {o.deliveryMethod === 'delivery' && (
                  <dl className="admin-order__facts">
                    {o.address && (<><dt>Dirección</dt><dd>{o.address}</dd></>)}
                    {o.ci && (<><dt>CI</dt><dd>{o.ci}</dd></>)}
                    {o.email && (<><dt>Correo</dt><dd>{o.email}</dd></>)}
                    {o.locationMapsUrl && (
                      <><dt>Ubicación</dt>
                        <dd>
                          <a href={o.locationMapsUrl} target="_blank" rel="noopener noreferrer">
                            Abrir en el mapa →
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                )}
              </div>

              {o.note && <p className="admin-order__note">{o.note}</p>}

              <footer className="admin-order__foot">
                <div className="admin-order__contact">
                  {o.phone && (
                    <a
                      href={`https://api.whatsapp.com/send/?phone=${o.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-order__wa"
                    >
                      <Icon name="whatsapp" style={{ width: 15, height: 15 }} /> {o.phone}
                    </a>
                  )}
                </div>
                <b className="admin-order__total">{formatPrice(o.total, o.currency)}</b>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

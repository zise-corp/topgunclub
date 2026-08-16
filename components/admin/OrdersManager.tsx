'use client';
import { useCallback, useEffect, useState } from 'react';
import type { OrderDTO } from '@/lib/store-types';
import { formatPrice } from '@/lib/store-types';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de pedidos: listado de pedidos (ventas por WhatsApp) y cambio de estado
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const STATUS_ORDER = ['recibido', 'en_proceso', 'completado', 'cancelado'];

export default function OrdersManager() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('todos');

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

  const filtered = filter === 'todos' ? orders : orders.filter((o) => o.status === filter);

  if (loading && orders.length === 0) {
    return <p className="admin-loading">Cargando pedidos…</p>;
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
        <p className="admin-empty">No hay pedidos {filter !== 'todos' ? `con estado "${STATUS_LABELS[filter]}"` : ''}.</p>
      ) : (
        <div className="admin-orders">
          {filtered.map((o) => (
            <article key={o.id} className="admin-order">
              <header className="admin-order__head">
                <div>
                  <b>Pedido #{o.number}</b>
                  <small>
                    {new Date(o.createdAt).toLocaleString('es-BO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </small>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => changeStatus(o, e.target.value)}
                  className={'admin-status admin-status--' + o.status}
                  aria-label="Estado del pedido"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </header>

              <div className="admin-order__items">
                {o.items.map((it) => (
                  <div key={it.id} className="admin-order__item">
                    <span>{it.name}</span>
                    <span>
                      ×{it.qty} · {formatPrice(it.price * it.qty, o.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <footer className="admin-order__foot">
                <div>
                  {o.customer && <p>👤 {o.customer}</p>}
                  {o.phone && <p>📱 {o.phone}</p>}
                  {o.note && (
                    <p className="admin-order__note">📝 {o.note}</p>
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

'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CategoryDTO, OrderDTO, ProductDTO } from '@/lib/store-types';
import { formatPrice } from '@/lib/store-types';
import Icon from '@/components/Icon';
import { STATUS_LABELS, STATUS_ORDER } from './order-status';

// ─────────────────────────────────────────────────────────────────────────────
// Resumen: estado del negocio de un vistazo (métricas + últimos pedidos).
// Lee de los mismos endpoints que las otras vistas; no calcula nada en servidor.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onGoToOrders: () => void;
  onGoToProducts: () => void;
}

export default function DashboardView({ onGoToOrders, onGoToProducts }: Props) {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [oRes, pRes, cRes] = await Promise.all([
        fetch('/api/admin/orders', { cache: 'no-store' }),
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
      ]);
      if (!oRes.ok || !pRes.ok || !cRes.ok) throw new Error('Sin autorización o error de servidor');
      const [o, p, c] = (await Promise.all([oRes.json(), pRes.json(), cRes.json()])) as [
        { orders: OrderDTO[] },
        { products: ProductDTO[] },
        { categories: CategoryDTO[] },
      ];
      setOrders(o.orders);
      setProducts(p.products);
      setCategories(c.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const byStatus = new Map<string, number>();
    STATUS_ORDER.forEach((s) => byStatus.set(s, 0));
    orders.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

    // Los cancelados no cuentan como ingreso.
    const revenue = orders
      .filter((o) => o.status !== 'cancelado')
      .reduce((acc, o) => acc + o.total, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = orders.filter((o) => new Date(o.createdAt) >= monthStart);

    return {
      byStatus,
      revenue,
      pending: byStatus.get('recibido') ?? 0,
      monthCount: monthOrders.length,
      monthRevenue: monthOrders
        .filter((o) => o.status !== 'cancelado')
        .reduce((acc, o) => acc + o.total, 0),
      activeProducts: products.filter((p) => p.active).length,
      hiddenProducts: products.filter((p) => !p.active).length,
      noImage: products.filter((p) => p.images.length === 0).length,
      deliveries: orders.filter((o) => o.deliveryMethod === 'delivery').length,
    };
  }, [orders, products]);

  const recent = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5),
    [orders]
  );

  if (loading && orders.length === 0 && products.length === 0) {
    return <div className="admin-skeleton-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="admin-skeleton" />)}</div>;
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2>Resumen</h2>
          <p>Estado de la tienda de un vistazo.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
          <Icon name="arrow" style={{ width: 15, height: 15 }} /> {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {/* KPIs */}
      <div className="kpi-grid">
        <article className="kpi kpi--gold">
          <span className="kpi__label">Pedidos por atender</span>
          <b className="kpi__value">{stats.pending}</b>
          <span className="kpi__foot">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} en total
          </span>
        </article>

        <article className="kpi kpi--green">
          <span className="kpi__label">Ingresos registrados</span>
          <b className="kpi__value">{formatPrice(stats.revenue)}</b>
          <span className="kpi__foot">Sin contar cancelados</span>
        </article>

        <article className="kpi">
          <span className="kpi__label">Este mes</span>
          <b className="kpi__value">{stats.monthCount}</b>
          <span className="kpi__foot">{formatPrice(stats.monthRevenue)} facturado</span>
        </article>

        <article className="kpi">
          <span className="kpi__label">Productos activos</span>
          <b className="kpi__value">{stats.activeProducts}</b>
          <span className="kpi__foot">
            {stats.hiddenProducts > 0 ? `${stats.hiddenProducts} oculto${stats.hiddenProducts !== 1 ? 's' : ''}` : 'Todos visibles'}
            {' · '}{categories.length} categorías
          </span>
        </article>
      </div>

      <div className="admin-cols">
        {/* Pedidos por estado */}
        <section className="admin-card">
          <header className="admin-card__head">
            <h3>Pedidos por estado</h3>
            <button type="button" className="admin-card__link" onClick={onGoToOrders}>
              Ver todos →
            </button>
          </header>
          <div className="status-bars">
            {STATUS_ORDER.map((s) => {
              const n = stats.byStatus.get(s) ?? 0;
              const pct = orders.length ? Math.round((n / orders.length) * 100) : 0;
              return (
                <div key={s} className="status-bar">
                  <div className="status-bar__top">
                    <span className={`admin-badge admin-badge--${s}`}>{STATUS_LABELS[s]}</span>
                    <b>{n}</b>
                  </div>
                  <div className="status-bar__track">
                    <span className={`status-bar__fill status-bar__fill--${s}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Últimos pedidos */}
        <section className="admin-card">
          <header className="admin-card__head">
            <h3>Últimos pedidos</h3>
            <button type="button" className="admin-card__link" onClick={onGoToOrders}>
              Ver todos →
            </button>
          </header>
          {recent.length === 0 ? (
            <p className="admin-empty admin-empty--sm">Todavía no hay pedidos.</p>
          ) : (
            <ul className="recent-list">
              {recent.map((o) => (
                <li key={o.id} className="recent-item">
                  <span className="recent-item__n">#{o.number}</span>
                  <span className="recent-item__info">
                    <b>{o.customer ?? 'Sin nombre'}</b>
                    <small>
                      {new Date(o.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                      {' · '}
                      {o.deliveryMethod === 'delivery' ? `Envío${o.region ? ` a ${o.region}` : ''}` : 'Retiro en local'}
                    </small>
                  </span>
                  <span className="recent-item__right">
                    <b>{formatPrice(o.total, o.currency)}</b>
                    <span className={`admin-badge admin-badge--${o.status}`}>{STATUS_LABELS[o.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Avisos accionables: solo aparecen si hay algo que corregir */}
      {(stats.noImage > 0 || stats.hiddenProducts > 0) && (
        <section className="admin-card">
          <header className="admin-card__head">
            <h3>Para revisar</h3>
          </header>
          <ul className="todo-list">
            {stats.noImage > 0 && (
              <li>
                <Icon name="image" style={{ width: 16, height: 16 }} />
                <span>
                  <b>{stats.noImage}</b> producto{stats.noImage !== 1 ? 's' : ''} sin foto — se ven vacíos en la tienda.
                </span>
                <button type="button" className="admin-card__link" onClick={onGoToProducts}>Revisar →</button>
              </li>
            )}
            {stats.hiddenProducts > 0 && (
              <li>
                <Icon name="package" style={{ width: 16, height: 16 }} />
                <span>
                  <b>{stats.hiddenProducts}</b> producto{stats.hiddenProducts !== 1 ? 's' : ''} oculto{stats.hiddenProducts !== 1 ? 's' : ''} de la tienda.
                </span>
                <button type="button" className="admin-card__link" onClick={onGoToProducts}>Revisar →</button>
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

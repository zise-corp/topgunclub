'use client';
import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CategoryDTO, ProductDTO } from '@/lib/store-types';
import Icon from '@/components/Icon';
import StoreProductCard from './StoreProductCard';
import ProductModal from './ProductModal';
import CartDrawer from './CartDrawer';
import CartFab from './CartFab';
import { CartProvider } from './CartContext';

// ─────────────────────────────────────────────────────────────────────────────
// Tienda virtual: filtros por categoría, búsqueda, grilla, detalle y carrito
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  products: ProductDTO[];
  categories: CategoryDTO[];
}

function StoreContent({ products, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get('cat') ?? 'todos';

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProductDTO | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const selectCategory = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug === 'todos') params.delete('cat');
      else params.set('cat', slug);
      router.replace(`/tienda${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat !== 'todos' && p.category.slug !== activeCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.caliber?.toLowerCase().includes(q) ||
        p.firearmType?.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q)
      );
    });
  }, [products, activeCat, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.category.slug, (map.get(p.category.slug) ?? 0) + 1));
    return map;
  }, [products]);

  const activeCategoryName =
    activeCat !== 'todos' ? categories.find((c) => c.slug === activeCat)?.name : 'Todos los productos';

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="page-hero grain">
        <div className="ph" aria-hidden="true" />
        <div className="page-hero__overlay" />
        <div className="container">
          <div className="crumbs">
            <Link href="/">Inicio</Link> <span>/</span> <b>Tienda</b>
          </div>
          <h1 className="display">
            TIENDA <span className="hl">TÁCTICA</span>
          </h1>
          <p className="lead">
            Armas de fuego, rifles PCP y equipamiento. Agregá al carrito y pedí por WhatsApp: te
            confirmamos stock y entrega al instante.
          </p>
        </div>
      </section>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <section className="section section--tight">
        <div className="container">
          <div className="store-toolbar">
            <div className="store-chips" role="tablist" aria-label="Categorías">
              <button
                type="button"
                role="tab"
                aria-selected={activeCat === 'todos'}
                className={'store-chip-btn' + (activeCat === 'todos' ? ' active' : '')}
                onClick={() => selectCategory('todos')}
              >
                Todos <span>{products.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCat === c.slug}
                  className={'store-chip-btn' + (activeCat === c.slug ? ' active' : '')}
                  onClick={() => selectCategory(c.slug)}
                >
                  {c.name} <span>{counts.get(c.slug) ?? 0}</span>
                </button>
              ))}
            </div>

            <label className="store-search">
              <Icon name="search" style={{ width: 17, height: 17 }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, marca o calibre…"
                aria-label="Buscar productos"
              />
            </label>
          </div>

          <p className="store-count">
            <b>{filtered.length}</b> producto{filtered.length !== 1 ? 's' : ''} · {activeCategoryName}
          </p>

          {filtered.length === 0 ? (
            <div className="store-empty">
              <Icon name="search" style={{ width: 40, height: 40, opacity: 0.4 }} />
              <p>No encontramos productos con esos filtros.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setQuery('');
                  selectCategory('todos');
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="store-grid">
              {filtered.map((p) => (
                <StoreProductCard key={p.id} product={p} onOpen={setSelected} />
              ))}
            </div>
          )}

          <div className="store-note" style={{ marginTop: 48 }}>
            <Icon name="shield" style={{ width: 20, height: 20 }} />
            <p>
              Las ventas se gestionan por WhatsApp. <b>Precios sujetos a disponibilidad.</b> La
              venta de armas de fuego se rige por la normativa vigente (Ley 400) y requiere
              documentación del comprador.
            </p>
          </div>
        </div>
      </section>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CartFab onOpen={() => setCartOpen(true)} />
    </>
  );
}

export default function StorePage(props: Props) {
  return (
    <CartProvider>
      <StoreContent {...props} />
    </CartProvider>
  );
}

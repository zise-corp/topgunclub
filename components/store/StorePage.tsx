'use client';
import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CategoryDTO, ProductDTO } from '@/lib/store-types';
import Icon from '@/components/Icon';
import StoreProductCard from './StoreProductCard';
import ProductModal from './ProductModal';

// ─────────────────────────────────────────────────────────────────────────────
// Tienda virtual: filtros por categoría, búsqueda, grilla y detalle.
// El carrito (provider, drawer y botón) es global — ver app/layout.tsx y Navbar.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  products: ProductDTO[];
  categories: CategoryDTO[];
}

// "Armas de Fuego" → Armas de <em>Fuego</em>. Reproduce el tratamiento de
// título del catálogo: la última palabra va destacada. Si es una sola
// palabra ("PCP"), se destaca entera.
function splitTitle(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return <em>{words[0]}</em>;
  const last = words.pop()!;
  return (
    <>
      {words.join(' ')} <em>{last}</em>
    </>
  );
}

export default function StorePage({ products, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get('cat') ?? 'todos';

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProductDTO | null>(null);

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

  // El catálogo siempre se muestra agrupado por categoría, con su título:
  // en "Todos" salen varios bloques y al filtrar queda uno solo, pero
  // encabezado incluido. Se agrupa desde los propios productos (así nunca se
  // pierde ninguno) y los bloques respetan el orden definido en el panel.
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; items: ProductDTO[] }>();
    filtered.forEach((p) => {
      const key = p.category.slug;
      if (!map.has(key)) map.set(key, { name: p.category.name, slug: key, items: [] });
      map.get(key)!.items.push(p);
    });
    const order = new Map(categories.map((c, i) => [c.slug, i]));
    return [...map.values()].sort(
      (a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999)
    );
  }, [filtered, categories]);

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
            TIENDA <span className="hl">TOP GUN</span>
          </h1>
          <p className="lead">
            Equipamiento, accesorios y todo lo que necesitás. Agregá al carrito y
            pide tus productos por WhatsApp: te confirmamos stock y coordinamos la entrega.
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

          {/* Total general: solo en "Todos", donde resume varias secciones.
              Al filtrar por una categoría, su propio encabezado ya lo dice. */}
          {activeCat === 'todos' && filtered.length > 0 && (
            <p className="store-count">
              <b>{filtered.length}</b> producto{filtered.length !== 1 ? 's' : ''} · {activeCategoryName}
            </p>
          )}

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
            grouped.map((g) => (
              <section key={g.slug} className="store-section">
                {/* Mismo encabezado centrado que usaba el catálogo: eyebrow +
                    título con la última palabra destacada en <em>. */}
                <div className="shead center">
                  <span className="eyebrow eyebrow--center">
                    {g.items.length} {g.items.length === 1 ? 'artículo' : 'artículos'}
                  </span>
                  <h2 className="section-title store-section__title">{splitTitle(g.name)}</h2>
                </div>
                <div className="store-grid">
                  {g.items.map((p) => (
                    <StoreProductCard key={p.id} product={p} onOpen={setSelected} />
                  ))}
                </div>
              </section>
            ))
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
    </>
  );
}

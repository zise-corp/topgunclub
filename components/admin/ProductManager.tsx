'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { CategoryDTO, ProductDTO } from '@/lib/store-types';
import { formatPrice } from '@/lib/store-types';
import Icon from '@/components/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de productos: listado + alta/edición (con subida a Cloudinary)
// ─────────────────────────────────────────────────────────────────────────────

type SpecPair = { key: string; value: string };

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  currency: 'USD',
  categoryId: '',
  kind: 'producto' as 'arma' | 'producto',
  brand: '',
  caliber: '',
  firearmType: '',
  active: true,
  featured: false,
};

export default function ProductManager() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ProductDTO | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('todas');
  const [visFilter, setVisFilter] = useState<'todos' | 'activos' | 'ocultos'>('todos');
  const [pendingDelete, setPendingDelete] = useState<ProductDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
      ]);
      if (!pRes.ok || !cRes.ok) throw new Error('Sin autorización o error de servidor');
      const [pData, cData] = (await Promise.all([pRes.json(), cRes.json()])) as [
        { products: ProductDTO[] },
        { categories: CategoryDTO[] },
      ];
      setProducts(pData.products);
      setCategories(cData.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pendingDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingId) setPendingDelete(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingDelete, deletingId]);

  // Antes de los returns tempranos: los hooks deben ejecutarse siempre.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'todas' && p.categoryId !== catFilter) return false;
      if (visFilter === 'activos' && !p.active) return false;
      if (visFilter === 'ocultos' && p.active) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.caliber ?? '').toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q)
      );
    });
  }, [products, query, catFilter, visFilter]);

  if (loading && products.length === 0) {
    return <div className="admin-skeleton-grid">{[0, 1, 2].map((i) => <div key={i} className="admin-skeleton" />)}</div>;
  }

  if (editing) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        categories={categories}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  const handleToggle = async (p: ProductDTO, field: 'active' | 'featured') => {
    const next = { ...p, [field]: !p[field] };
    setProducts((prev) => prev.map((x) => (x.id === p.id ? next : x)));
    const payload = toPayload(next);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        setError('No se pudo actualizar el producto');
      }
    } catch {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      setError('Error de red al actualizar');
    }
  };

  const handleDelete = async (p: ProductDTO) => {
    setDeletingId(p.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'No se pudo eliminar');
      }
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red al eliminar');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2>Productos</h2>
          <p>
            {products.length} en total · {products.filter((p) => p.active).length} activos en la
            tienda
          </p>
        </div>
        <button type="button" className="btn btn--wa" onClick={() => setEditing('new')}>
          <Icon name="plus" style={{ width: 16, height: 16 }} /> Nuevo producto
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {products.length > 0 && (
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" style={{ width: 16, height: 16 }} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, marca o calibre…"
              aria-label="Buscar productos"
            />
          </label>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filtrar por categoría"
            className="admin-select"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="admin-chips">
            {(['todos', 'activos', 'ocultos'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={'admin-chip' + (visFilter === v ? ' active' : '')}
                onClick={() => setVisFilter(v)}
              >
                {v === 'todos' ? 'Todos' : v === 'activos' ? 'En tienda' : 'Ocultos'}
              </button>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="admin-empty">
          <Icon name="package" style={{ width: 34, height: 34, opacity: 0.35 }} />
          <p>Todavía no hay productos.</p>
          <button type="button" className="btn btn--wa" onClick={() => setEditing('new')}>
            <Icon name="plus" style={{ width: 15, height: 15 }} /> Crear el primero
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <Icon name="search" style={{ width: 34, height: 34, opacity: 0.35 }} />
          <p>Ningún producto coincide con esos filtros.</p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => { setQuery(''); setCatFilter('todas'); setVisFilter('todos'); }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <p className="admin-count">
            Mostrando <b>{filtered.length}</b> de {products.length}
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Tienda</th>
                <th>Destacado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td data-label="Producto">
                    <div className="admin-prod">
                      <span className="admin-prod__thumb">
                        {p.images[0] ? (
                          <Image src={p.images[0].url} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} unoptimized />
                        ) : (
                          <Icon name="image" style={{ width: 18, height: 18, opacity: 0.4 }} />
                        )}
                      </span>
                      <span>
                        <b>{p.name}</b>
                        <small>
                          {p.kind === 'arma' ? (p.brand ?? 'Arma') : 'Producto'}
                          {p.caliber ? ` · ${p.caliber}` : ''}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Categoría">
                    <span className="admin-tagpill">{p.category.name}</span>
                  </td>
                  <td className="admin-price" data-label="Precio">{formatPrice(p.price, p.currency)}</td>
                  <td data-label="En tienda">
                    <button
                      type="button"
                      className={'admin-toggle' + (p.active ? ' on' : '')}
                      onClick={() => handleToggle(p, 'active')}
                      aria-label={p.active ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                    >
                      <span />
                    </button>
                  </td>
                  <td data-label="Destacado">
                    <button
                      type="button"
                      className={'admin-star' + (p.featured ? ' on' : '')}
                      onClick={() => handleToggle(p, 'featured')}
                      aria-label={p.featured ? 'Quitar destacado' : 'Marcar destacado'}
                    >
                      <Icon name="star" style={{ width: 17, height: 17 }} />
                    </button>
                  </td>
                  <td data-label="Acciones">
                    <div className="admin-row-actions">
                      <button type="button" className="admin-icon-btn" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`}>
                        <Icon name="edit" style={{ width: 16, height: 16 }} />
                      </button>
                      <button type="button" className="admin-icon-btn danger" onClick={() => setPendingDelete(p)} aria-label={`Eliminar ${p.name}`}>
                        <Icon name="trash" style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <div
          className="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
          aria-describedby="delete-product-description"
          data-native-cursor
        >
          <button
            type="button"
            className="confirm-modal__backdrop"
            onClick={() => !deletingId && setPendingDelete(null)}
            aria-label="Cancelar eliminación"
          />
          <div className="confirm-modal__panel confirm-modal__panel--danger">
            <span className="confirm-modal__danger-icon" aria-hidden="true">
              <Icon name="trash" style={{ width: 22, height: 22 }} />
            </span>
            <h4 id="delete-product-title">¿Eliminar producto?</h4>
            <p id="delete-product-description">
              Se eliminará <b>“{pendingDelete.name}”</b> junto con sus imágenes. Esta acción no se puede deshacer.
            </p>
            <div className="confirm-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPendingDelete(null)}
                disabled={deletingId === pendingDelete.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => handleDelete(pendingDelete)}
                disabled={deletingId === pendingDelete.id}
              >
                <Icon name="trash" style={{ width: 17, height: 17 }} />
                {deletingId === pendingDelete.id ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulario ───────────────────────────────────────────────────────────────

function toPayload(p: ProductDTO) {
  return {
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    currency: p.currency,
    categoryId: p.categoryId,
    kind: p.kind,
    brand: p.kind === 'arma' ? p.brand : null,
    caliber: p.kind === 'arma' ? p.caliber : null,
    firearmType: p.kind === 'arma' ? p.firearmType : null,
    specs: p.specs,
    active: p.active,
    featured: p.featured,
    images: p.images.map((img) => ({ url: img.url, alt: img.alt ?? undefined })),
  };
}

function ProductForm({
  product,
  categories,
  onCancel,
  onSaved,
}: {
  product: ProductDTO | null;
  categories: CategoryDTO[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          price: String(product.price),
          currency: product.currency,
          categoryId: product.categoryId,
          kind: product.kind,
          brand: product.brand ?? '',
          caliber: product.caliber ?? '',
          firearmType: product.firearmType ?? '',
          active: product.active,
          featured: product.featured,
        }
      : { ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' }
  );
  const [specs, setSpecs] = useState<SpecPair[]>(() =>
    Object.entries(product?.specs ?? {}).map(([key, value]) => ({ key, value }))
  );
  const [images, setImages] = useState<{ url: string; alt?: string }[]>(
    () => product?.images.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) ?? []
  );
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    const added: { url: string }[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          added.push({ url: data.url });
        } else {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? `No se pudo subir ${file.name}`);
        }
      } catch {
        setError(`Error de red al subir ${file.name}`);
      }
    }
    setImages((prev) => [...prev, ...added].slice(0, 12));
    setUploading(false);
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setImages((prev) => (prev.length >= 12 ? prev : [...prev, { url }]));
    setUrlInput('');
  };

  const handleSpecChange = (i: number, field: 'key' | 'value', value: string) => {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    setSaving(true);
    try {
      const price = Number(form.price);
      if (!form.name.trim() || Number.isNaN(price) || price <= 0) {
        throw new Error('Completá el nombre y un precio válido');
      }
      if (!form.categoryId) throw new Error('Seleccioná una categoría');
      if (images.length === 0) throw new Error('Agregá al menos una imagen');

      const cleanSpecs = Object.fromEntries(
        specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()])
      );

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        currency: form.currency || 'USD',
        categoryId: form.categoryId,
        kind: form.kind,
        brand: form.kind === 'arma' ? form.brand.trim() || null : null,
        caliber: form.kind === 'arma' ? form.caliber.trim() || null : null,
        firearmType: form.kind === 'arma' ? form.firearmType.trim() || null : null,
        specs: cleanSpecs,
        active: form.active,
        featured: form.featured,
        images: images.map((img) => ({ url: img.url, alt: img.alt })),
      };

      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : '/api/admin/products',
        {
          method: product ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar el producto');
      setOk('Producto guardado ✓');
      window.setTimeout(onSaved, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-section admin-form" onSubmit={submit}>
      <div className="admin-section__head">
        <div>
          <h2>{product ? `Editar: ${product.name}` : 'Nuevo producto'}</h2>
          <p>Los campos con * son obligatorios.</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          ← Volver al listado
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {ok && <p className="admin-ok">{ok}</p>}

      <div className="admin-form__grid">
        <div className="admin-form__col">
          <label className="field">
            <span>Nombre *</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} placeholder="Ej: Walther P22Q" />
          </label>

          <label className="field">
            <span>Descripción</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={5000} placeholder="Descripción del producto (opcional)" />
          </label>

          <div className="admin-form__row">
            <label className="field">
              <span>Precio *</span>
              <input type="number" inputMode="decimal" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Moneda *</span>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="USD">Dólares ($)</option>
                <option value="BOB">Bolivianos (Bs)</option>
              </select>
            </label>
            <label className="field">
              <span>Categoría *</span>
              <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="admin-radio">
            <legend>Tipo de producto</legend>
            <label>
              <input type="radio" name="kind" checked={form.kind === 'arma'} onChange={() => set('kind', 'arma')} />
              <span>Arma (industria, calibre, tipo)</span>
            </label>
            <label>
              <input type="radio" name="kind" checked={form.kind === 'producto'} onChange={() => set('kind', 'producto')} />
              <span>Producto / Regalo (título, descripción, precio)</span>
            </label>
          </fieldset>

          {form.kind === 'arma' && (
            <div className="admin-form__row admin-form__row--3">
              <label className="field">
                <span>Industria / Marca</span>
                <input value={form.brand} onChange={(e) => set('brand', e.target.value)} maxLength={120} placeholder="Ej: WALTHER" />
              </label>
              <label className="field">
                <span>Calibre</span>
                <input value={form.caliber} onChange={(e) => set('caliber', e.target.value)} maxLength={50} placeholder="Ej: 9mm" />
              </label>
              <label className="field">
                <span>Tipo</span>
                <input value={form.firearmType} onChange={(e) => set('firearmType', e.target.value)} maxLength={120} placeholder="Ej: Semiautomática" />
              </label>
            </div>
          )}

          <div className="admin-form__specs">
            <div className="admin-form__specs-head">
              <b>Especificaciones adicionales</b>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setSpecs((prev) => [...prev, { key: '', value: '' }])}
                aria-label="Agregar especificación"
              >
                <Icon name="plus" style={{ width: 15, height: 15 }} />
              </button>
            </div>
            {specs.length === 0 && <p className="admin-hint">Ej: Velocidad, Energía, Tanque, Capacidad…</p>}
            {specs.map((s, i) => (
              <div key={i} className="admin-form__spec-row">
                <input value={s.key} onChange={(e) => handleSpecChange(i, 'key', e.target.value)} placeholder="Nombre (Ej: Velocidad)" />
                <input value={s.value} onChange={(e) => handleSpecChange(i, 'value', e.target.value)} placeholder="Valor (Ej: 970 fps)" />
                <button
                  type="button"
                  className="admin-icon-btn danger"
                  onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Quitar especificación"
                >
                  <Icon name="trash" style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>

          <div className="admin-form__checks">
            <label className="admin-check">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              <span>Visible en la tienda</span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              <span>Destacado (aparece primero)</span>
            </label>
          </div>
        </div>

        <div className="admin-form__col">
          <div className="admin-upload">
            <div className="admin-form__specs-head">
              <b>Imágenes * (máx. 12)</b>
            </div>
            <label className="admin-upload__btn">
              <Icon name="image" style={{ width: 20, height: 20 }} />
              {uploading ? 'Subiendo imagen…' : 'Subir imágenes'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
            <div className="admin-upload__url">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="O pegá una URL de imagen…" />
              <button type="button" className="btn btn--ghost" onClick={addUrl}>
                Agregar
              </button>
            </div>

            {images.length === 0 ? (
              <p className="admin-hint">Aún no hay imágenes. La primera será la portada del producto.</p>
            ) : (
              <div className="admin-upload__grid">
                {images.map((img, i) => (
                  <div key={i} className="admin-upload__item">
                    <Image src={img.url} alt="" fill sizes="96px" style={{ objectFit: 'cover' }} unoptimized />
                    {i === 0 && <span className="admin-upload__cover">Portada</span>}
                    <button
                      type="button"
                      className="admin-upload__del"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Quitar imagen"
                    >
                      <Icon name="close" style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--wa btn--lg" disabled={saving || uploading}>
          {saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}

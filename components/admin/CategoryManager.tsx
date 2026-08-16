'use client';
import { useCallback, useEffect, useState } from 'react';
import type { CategoryDTO } from '@/lib/store-types';
import Icon from '@/components/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de categorías: listado, alta, renombrado y eliminación
// ─────────────────────────────────────────────────────────────────────────────

export default function CategoryManager() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!res.ok) throw new Error('Sin autorización');
      const data = (await res.json()) as { categories: CategoryDTO[] };
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo crear la categoría');
      setName('');
      setDescription('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setBusy(false);
    }
  };

  const rename = async (id: string) => {
    if (editName.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo renombrar');
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al renombrar');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CategoryDTO) => {
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo eliminar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  if (loading && categories.length === 0) {
    return <p className="admin-loading">Cargando categorías…</p>;
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2>Categorías</h2>
          <p>Agrupá los productos: Armas de Fuego, PCP, Productos, Regalos…</p>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <form className="admin-form admin-form--cat" onSubmit={create}>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría (Ej: Munición)"
          maxLength={80}
          required
        />
        <input
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción corta (opcional)"
          maxLength={500}
        />
        <button type="submit" className="btn btn--wa" disabled={busy || name.trim().length < 2}>
          <Icon name="plus" style={{ width: 15, height: 15 }} /> Crear
        </button>
      </form>

      <div className="admin-cat-list">
        {categories.map((c) => (
          <div key={c.id} className="admin-cat">
            {editingId === c.id ? (
              <div className="admin-cat__edit">
                <input
                  className="field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <button type="button" className="btn btn--wa" onClick={() => rename(c.id)} disabled={busy}>
                  Guardar
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="admin-cat__info">
                  <b>{c.name}</b>
                  <small>
                    {c.productCount} producto{c.productCount !== 1 ? 's' : ''}
                    {c.description ? ` · ${c.description}` : ''}
                  </small>
                </div>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    aria-label="Renombrar"
                  >
                    <Icon name="edit" style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn danger"
                    onClick={() => remove(c)}
                    aria-label="Eliminar"
                  >
                    <Icon name="trash" style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

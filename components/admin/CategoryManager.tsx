'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryDTO } from '@/lib/store-types';
import Icon from '@/components/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de categorías: listado, alta, edición y eliminación
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
  const [editDescription, setEditDescription] = useState('');
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoryDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const orderSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderSaveVersion = useRef(0);

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

  useEffect(() => () => {
    if (orderSaveTimer.current) clearTimeout(orderSaveTimer.current);
  }, []);

  useEffect(() => {
    if (!pendingDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingId) setPendingDelete(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingDelete, deletingId]);

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

  const updateCategory = async (id: string) => {
    if (editName.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo actualizar la categoría');
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CategoryDTO) => {
    setDeletingId(c.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo eliminar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const saveCategoryOrder = (next: CategoryDTO[]) => {
    const version = ++orderSaveVersion.current;
    setCategories(next);
    setReordering(true);
    setError('');
    if (orderSaveTimer.current) clearTimeout(orderSaveTimer.current);
    orderSaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: next.map((category) => category.id) }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar el orden');
      } catch (e) {
        if (version === orderSaveVersion.current) {
          setError(e instanceof Error ? e.message : 'Error al ordenar categorías');
          await load();
        }
      } finally {
        if (version === orderSaveVersion.current) {
          setReordering(false);
          orderSaveTimer.current = null;
        }
      }
    }, 250);
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    saveCategoryOrder(next);
  };

  const dropCategory = (targetIndex: number) => {
    if (!draggedId) return;
    const sourceIndex = categories.findIndex((category) => category.id === draggedId);
    setDraggedId(null);
    setDragOverId(null);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;

    const next = [...categories];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    saveCategoryOrder(next);
  };

  if (loading && categories.length === 0) {
    return <p className="admin-loading">Cargando categorías…</p>;
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2>Categorías</h2>
          <p>
            Ordenalas para decidir qué categorías y productos aparecen primero en la tienda.
            {reordering && <span style={{ color: 'var(--green-bright)' }}> · Guardando orden…</span>}
          </p>
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
        <textarea
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción corta (opcional)"
          maxLength={500}
          rows={2}
        />
        <button type="submit" className="btn btn--wa" disabled={busy || name.trim().length < 2}>
          <Icon name="plus" style={{ width: 15, height: 15 }} /> Crear
        </button>
      </form>

      <div className="admin-cat-list">
        {categories.map((c, index) => (
          <div
            key={c.id}
            className={'admin-cat' + (dragOverId === c.id ? ' is-drag-over' : '')}
            onDragOver={(event) => {
              event.preventDefault();
              if (draggedId && draggedId !== c.id) setDragOverId(c.id);
            }}
            onDragLeave={() => dragOverId === c.id && setDragOverId(null)}
            onDrop={(event) => {
              event.preventDefault();
              dropCategory(index);
            }}
          >
            {editingId === c.id ? (
              <div className="admin-cat__edit">
                <input
                  className="field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <textarea
                  className="field"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Descripción corta (opcional)"
                  aria-label={`Descripción de ${c.name}`}
                  maxLength={500}
                  rows={2}
                />
                <button type="button" className="btn btn--wa" onClick={() => updateCategory(c.id)} disabled={busy || editName.trim().length < 2}>
                  Guardar
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="admin-cat__order-controls">
                  <span
                    className="admin-cat__drag"
                    draggable
                    onDragStart={(event) => {
                      setDraggedId(c.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', c.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Arrastrar ${c.name} para cambiar su posición`}
                    title="Arrastrar para ordenar"
                  >
                    <i /><i /><i />
                  </span>
                  <span className="admin-cat__position" aria-label={`Posición ${index + 1}`}>
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover ${c.name} hacia arriba`}
                    title="Mostrar antes"
                  >
                    <Icon name="chevron" style={{ width: 15, height: 15, transform: 'rotate(180deg)' }} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1}
                    aria-label={`Mover ${c.name} hacia abajo`}
                    title="Mostrar después"
                  >
                    <Icon name="chevron" style={{ width: 15, height: 15 }} />
                  </button>
                </div>
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
                      setEditDescription(c.description ?? '');
                    }}
                    aria-label="Editar categoría"
                  >
                    <Icon name="edit" style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-btn danger"
                    onClick={() => setPendingDelete(c)}
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

      {pendingDelete && (
        <div
          className="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-category-title"
          aria-describedby="delete-category-description"
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
            <h4 id="delete-category-title">¿Eliminar categoría?</h4>
            <p id="delete-category-description">
              Se eliminará <b>“{pendingDelete.name}”</b>. Solo es posible eliminar categorías que no tengan productos asociados.
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
                onClick={() => remove(pendingDelete)}
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

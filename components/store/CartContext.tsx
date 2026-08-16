'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, ProductDTO } from '@/lib/store-types';

// ─────────────────────────────────────────────────────────────────────────────
// Carrito de compras (persistido en localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tgc_cart_v1';

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: ProductDTO, qty?: number) => void;
  remove: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Carga inicial desde localStorage (después del mount para evitar mismatch SSR)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (it) => it && typeof it.productId === 'string' && typeof it.qty === 'number'
            )
          );
        }
      }
    } catch {
      // localStorage corrupto: se ignora
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento no disponible
    }
  }, [items, hydrated]);

  const add = useCallback((product: ProductDTO, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id ? { ...it, qty: Math.min(99, it.qty + qty) } : it
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images[0]?.url ?? null,
          qty: Math.min(99, qty),
        },
      ];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((it) => it.productId !== productId)
        : prev.map((it) => (it.productId === productId ? { ...it, qty: Math.min(99, qty) } : it))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((acc, it) => acc + it.qty, 0);
    const total = items.reduce((acc, it) => acc + it.price * it.qty, 0);
    return { items, count, total, add, remove, updateQty, clear };
  }, [items, add, remove, updateQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}

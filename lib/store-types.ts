// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartidos entre servidor (Prisma) y cliente (tienda/admin)
// ─────────────────────────────────────────────────────────────────────────────

export type ProductImageDTO = {
  id: string;
  url: string;
  publicId: string | null;
  alt: string | null;
  sortOrder: number;
};

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
};

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  kind: 'arma' | 'producto';
  brand: string | null;
  caliber: string | null;
  firearmType: string | null;
  specs: Record<string, string>;
  active: boolean;
  featured: boolean;
  images: ProductImageDTO[];
  createdAt: string;
  updatedAt: string;
};

export type OrderItemDTO = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderDTO = {
  id: string;
  number: number;
  customer: string | null;
  phone: string | null;
  note: string | null;
  status: string;
  total: number;
  currency: string;
  items: OrderItemDTO[];
  createdAt: string;
};

// Carrito en el cliente (persistido en localStorage)
export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  qty: number;
};

export function parseSpecsJson(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

export function formatPrice(value: number, currency = 'USD'): string {
  const symbol = currency === 'BOB' ? 'Bs ' : '$';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

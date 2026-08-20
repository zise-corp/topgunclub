import type { Category, Order, OrderItem, Product, ProductImage } from '@prisma/client';
import { parseSpecsJson } from '@/lib/store-types';
import type { CategoryDTO, OrderDTO, ProductDTO } from '@/lib/store-types';

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo Prisma → DTOs (serialización de Decimal, fechas y specs JSON)
// ─────────────────────────────────────────────────────────────────────────────

type ProductWithRelations = Product & { category: Category; images: ProductImage[] };
type CategoryWithCount = Category & { _count?: { products: number } };
type OrderWithItems = Order & { items: OrderItem[] };

export function toProductDTO(p: ProductWithRelations): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    categoryId: p.categoryId,
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
    },
    kind: p.kind === 'arma' ? 'arma' : 'producto',
    brand: p.brand,
    caliber: p.caliber,
    firearmType: p.firearmType,
    specs: parseSpecsJson(p.specsJson),
    active: p.active,
    featured: p.featured,
    images: [...p.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        url: img.url,
        publicId: img.publicId,
        alt: img.alt,
        sortOrder: img.sortOrder,
      })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toCategoryDTO(c: CategoryWithCount): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    sortOrder: c.sortOrder,
    productCount: c._count?.products ?? 0,
  };
}

export function toOrderDTO(o: OrderWithItems): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    customer: o.customer,
    phone: o.phone,
    note: o.note,
    deliveryMethod: o.deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
    region: o.region,
    address: o.address,
    locationLat: o.locationLat,
    locationLng: o.locationLng,
    locationMapsUrl: o.locationMapsUrl,
    ci: o.ci,
    email: o.email,
    status: o.status,
    total: Number(o.total),
    currency: o.currency,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price),
      qty: it.qty,
    })),
    createdAt: o.createdAt.toISOString(),
  };
}

/** Slug único: agrega sufijo -2, -3… si ya existe. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const clean = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  let slug = clean || 'producto';
  let i = 2;
  while (await isTaken(slug)) {
    slug = `${clean || 'producto'}-${i}`;
    i++;
  }
  return slug;
}

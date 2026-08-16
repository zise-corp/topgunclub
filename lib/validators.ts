import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Validación de entrada con Zod (server-side; el cliente valida por su lado)
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(200),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(80),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const productImageInputSchema = z.object({
  url: z.string().trim().url('URL de imagen inválida').max(1000),
  alt: z.string().trim().max(200).optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es obligatorio').max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.coerce.number().positive('El precio debe ser mayor a 0').max(1_000_000_000),
  currency: z.string().trim().max(8).default('USD'),
  categoryId: z.string().trim().min(1, 'Seleccioná una categoría'),
  kind: z.enum(['arma', 'producto'], { message: 'Tipo inválido' }),
  brand: z.string().trim().max(120).nullable().optional(),
  caliber: z.string().trim().max(50).nullable().optional(),
  firearmType: z.string().trim().max(120).nullable().optional(),
  specs: z.record(z.string(), z.string()).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  images: z.array(productImageInputSchema).max(12, 'Máximo 12 imágenes'),
});

export const orderItemSchema = z.object({
  productId: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  price: z.coerce.number().nonnegative().max(1_000_000_000),
  qty: z.coerce.number().int().min(1).max(99),
});

export const orderInputSchema = z.object({
  customer: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
  items: z.array(orderItemSchema).min(1, 'El carrito está vacío').max(100),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;

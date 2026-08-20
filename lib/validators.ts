import { z } from 'zod';
import { REGIONS, isLocalRegion, isValidMapsUrl } from '@/lib/delivery';

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
  currency: z.enum(['USD', 'BOB']).default('USD'),
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
  currency: z.enum(['USD', 'BOB']).default('USD'),
  qty: z.coerce.number().int().min(1).max(99),
});

export const orderInputSchema = z
  .object({
    customer: z.string().trim().max(120).optional().default(''),
    phone: z.string().trim().max(40).optional().default(''),
    note: z.string().trim().max(1000).optional().default(''),
    deliveryMethod: z.enum(['pickup', 'delivery']).default('pickup'),
    region: z.enum(REGIONS).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    locationLat: z.coerce.number().min(-90).max(90).nullable().optional(),
    locationLng: z.coerce.number().min(-180).max(180).nullable().optional(),
    locationMapsUrl: z.string().trim().max(2000).nullable().optional(),
    ci: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().email('Correo inválido').max(200).nullable().optional(),
    items: z.array(orderItemSchema).min(1, 'El carrito está vacío').max(100),
  })
  // Reglas condicionales: qué exige cada tipo de entrega.
  .superRefine((data, ctx) => {
    if (data.deliveryMethod !== 'delivery') return;

    if (!data.region) {
      ctx.addIssue({ code: 'custom', path: ['region'], message: 'Elegí tu departamento' });
      return;
    }

    if (isLocalRegion(data.region)) {
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Ingresá tu dirección' });
      }
      const hasCoords = data.locationLat != null && data.locationLng != null;
      const hasMapsUrl = !!data.locationMapsUrl && isValidMapsUrl(data.locationMapsUrl);
      if (!hasCoords && !hasMapsUrl) {
        ctx.addIssue({
          code: 'custom',
          path: ['locationMapsUrl'],
          message: 'Compartí tu ubicación o pegá un link de Google Maps válido',
        });
      }
      return;
    }

    if (!data.ci) {
      ctx.addIssue({ code: 'custom', path: ['ci'], message: 'Ingresá tu CI' });
    }
    if (!data.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Ingresá tu correo' });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;

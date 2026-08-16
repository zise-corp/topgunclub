import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toProductDTO, uniqueSlug } from '@/lib/server-dto';
import { productInputSchema } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ error: 'La categoría no existe' }, { status: 400 });

  // Mantiene el slug si el nombre no cambió; si cambió, genera uno nuevo único
  const nameChanged = data.name.trim() !== existing.name;
  const slug = nameChanged
    ? await uniqueSlug(data.name, async (s) => {
        if (s === existing.slug) return false;
        return Boolean(await prisma.product.findUnique({ where: { slug: s } }));
      })
    : existing.slug;

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      price: data.price,
      currency: data.currency,
      categoryId: data.categoryId,
      kind: data.kind,
      brand: data.brand || null,
      caliber: data.caliber || null,
      firearmType: data.firearmType || null,
      specsJson: data.specs && Object.keys(data.specs).length > 0 ? JSON.stringify(data.specs) : null,
      active: data.active ?? true,
      featured: data.featured ?? false,
      images: {
        deleteMany: {},
        create: data.images.map((img, i) => ({
          url: img.url,
          alt: img.alt || data.name,
          sortOrder: i,
        })),
      },
    },
    include: { category: true, images: true },
  });

  return NextResponse.json({ product: toProductDTO(product) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!existing) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

  // Limpieza best-effort de imágenes en Cloudinary (no bloquea la eliminación)
  const publicIds = existing.images.map((img) => img.publicId).filter(Boolean) as string[];
  if (publicIds.length > 0) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      await cloudinary.api.delete_resources(publicIds);
    } catch {
      // si la limpieza falla, el producto igual se elimina de la DB
    }
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toProductDTO, uniqueSlug } from '@/lib/server-dto';
import { productInputSchema } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    include: { category: true, images: true },
  });
  return NextResponse.json({ products: products.map(toProductDTO) });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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
  if (!category) {
    return NextResponse.json({ error: 'La categoría no existe' }, { status: 400 });
  }

  const slug = await uniqueSlug(data.name, async (s) =>
    Boolean(await prisma.product.findUnique({ where: { slug: s } }))
  );

  const product = await prisma.product.create({
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
        create: data.images.map((img, i) => ({
          url: img.url,
          alt: img.alt || data.name,
          sortOrder: i,
        })),
      },
    },
    include: { category: true, images: true },
  });

  return NextResponse.json({ product: toProductDTO(product) }, { status: 201 });
}

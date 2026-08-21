import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toCategoryDTO, uniqueSlug } from '@/lib/server-dto';
import { categoryInputSchema } from '@/lib/validators';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories: categories.map(toCategoryDTO) });
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

  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slug = await uniqueSlug(data.name, async (s) =>
    Boolean(await prisma.category.findUnique({ where: { slug: s } }))
  );

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 99,
    },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ category: toCategoryDTO(category) }, { status: 201 });
}

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(999),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.orderedIds).size !== parsed.data.orderedIds.length) {
    return NextResponse.json({ error: 'Orden de categorías inválido' }, { status: 400 });
  }

  const existing = await prisma.category.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((category) => category.id));
  if (
    existingIds.size !== parsed.data.orderedIds.length ||
    parsed.data.orderedIds.some((id) => !existingIds.has(id))
  ) {
    return NextResponse.json({ error: 'La lista de categorías está incompleta' }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}

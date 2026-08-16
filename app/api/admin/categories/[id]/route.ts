import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toCategoryDTO, uniqueSlug } from '@/lib/server-dto';
import { categoryInputSchema } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

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

  const nameChanged = data.name.trim() !== existing.name;
  const slug = nameChanged
    ? await uniqueSlug(data.name, async (s) => {
        if (s === existing.slug) return false;
        return Boolean(await prisma.category.findUnique({ where: { slug: s } }));
      })
    : existing.slug;

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? existing.sortOrder,
    },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ category: toCategoryDTO(category) });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await ctx.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });

  if (category._count.products > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${category._count.products} producto(s). Movelos a otra categoría primero.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

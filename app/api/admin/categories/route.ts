import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toCategoryDTO, uniqueSlug } from '@/lib/server-dto';
import { categoryInputSchema } from '@/lib/validators';

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

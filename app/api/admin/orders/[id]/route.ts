import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toOrderDTO } from '@/lib/server-dto';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['recibido', 'en_proceso', 'completado', 'cancelado'] as const;

const statusSchema = z.object({
  status: z.enum(STATUSES, { message: 'Estado inválido' }),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const order = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { items: true },
  });

  return NextResponse.json({ order: toOrderDTO(order) });
}

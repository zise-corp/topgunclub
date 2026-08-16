import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { toOrderDTO } from '@/lib/server-dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: { items: true },
  });
  return NextResponse.json({ orders: orders.map(toOrderDTO) });
}

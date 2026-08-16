import { NextResponse } from 'next/server';
import type { Order, OrderItem } from '@prisma/client';
import { prisma } from '@/lib/db';
import { orderInputSchema } from '@/lib/validators';
import { toOrderDTO } from '@/lib/server-dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Registra un pedido cuando el cliente confirma el carrito por WhatsApp.
// El precio de cada ítem se re-verifica contra la DB cuando el producto existe.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const productIds = data.items
    .map((it) => it.productId)
    .filter((id): id is string => Boolean(id));

  const products = productIds.length > 0
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = data.items.map((it) => {
    const dbProduct = it.productId ? productMap.get(it.productId) : undefined;
    return {
      productId: dbProduct ? dbProduct.id : (it.productId ?? null),
      name: dbProduct ? dbProduct.name : it.name,
      price: dbProduct ? dbProduct.price : it.price,
      qty: Math.min(99, Math.max(1, Math.round(it.qty))),
    };
  });

  const total = items.reduce((acc, it) => acc + Number(it.price) * it.qty, 0);

  // Número correlativo en transacción (SQLite no soporta autoincrement en no-id)
  let order: (Order & { items: OrderItem[] }) | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const last = await tx.order.findFirst({
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        const number = (last?.number ?? 0) + 1;
        return tx.order.create({
          data: {
            number,
            customer: data.customer || null,
            phone: data.phone || null,
            note: data.note || null,
            total,
            currency: 'USD',
            items: { create: items },
          },
          include: { items: true },
        });
      });
      break;
    } catch (err) {
      const isConflict =
        err instanceof Error && String(err.message).includes('Unique constraint failed');
      if (!isConflict || attempt === 2) throw err;
    }
  }
  if (!order) {
    return NextResponse.json({ error: 'No se pudo registrar el pedido' }, { status: 500 });
  }

  return NextResponse.json({ order: toOrderDTO(order) }, { status: 201 });
}

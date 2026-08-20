import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Categorías públicas para el menú de navegación. Es información visible en la
// tienda, así que no requiere sesión. Se cachea un minuto: el navbar la pide en
// cada carga de página y las categorías cambian muy de vez en cuando.
export const runtime = 'nodejs';
// La respuesta depende de la base remota. Evita consultar la BD durante el
// build de Docker, cuando las credenciales de producción no deben existir.
export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ categories });
}

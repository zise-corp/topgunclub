import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/store-types';
import { waLink } from '@/lib/site';
import Icon from '@/components/Icon';

// Página de confirmación de pedido: WhatsApp la visita para leer el og:image
// (opengraph-image.tsx, en esta misma carpeta) y mostrar el recibo como preview.
// No se indexa: es un link personal del pedido, no contenido público del sitio.

interface Props {
  params: Promise<{ id: string }>;
}

async function getOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, include: { items: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return { title: 'Pedido no encontrado' };
  return {
    title: `Pedido N° ${order.number}`,
    description: `Resumen de tu pedido en Top Gun Club — Total ${formatPrice(Number(order.total), order.currency)}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PedidoPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <section className="section" style={{ paddingTop: 'calc(var(--nav-h) + 48px)' }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div style={{
          border: '1px solid var(--line)', borderRadius: 'var(--r)',
          padding: '32px', background: 'var(--surface)',
        }}>
          <span className="eyebrow" style={{ color: 'var(--green-bright)' }}>Pedido N° {order.number}</span>
          <h1 className="section-title" style={{ fontSize: '1.8rem', margin: '10px 0 6px' }}>
            ¡Gracias{order.customer ? `, ${order.customer}` : ''}!
          </h1>
          <p style={{ color: 'var(--faint)', marginBottom: 26 }}>
            Tu pedido fue registrado. Coordinamos stock y entrega por WhatsApp.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {order.items.map((it) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.95rem', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <span>{it.name} <span style={{ color: 'var(--faint)' }}>×{it.qty}</span></span>
                <b>{formatPrice(Number(it.price) * it.qty, order.currency)}</b>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 }}>
            <span style={{ color: 'var(--faint)', letterSpacing: '.05em' }}>TOTAL</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green-bright)' }}>
              {formatPrice(Number(order.total), order.currency)}
            </span>
          </div>

          <a
            href={waLink(`Hola! Te escribo por mi pedido N° ${order.number}`)}
            target="_blank" rel="noopener noreferrer"
            className="btn btn--wa btn--block"
            style={{ marginTop: 26 }}
          >
            <Icon name="whatsapp" /> Escribirnos por WhatsApp
          </a>
          <Link href="/tienda" className="btn btn--ghost btn--block" style={{ marginTop: 12 }}>
            Seguir comprando
          </Link>
        </div>
      </div>
    </section>
  );
}

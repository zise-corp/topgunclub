import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/store-types';

// Recibo visual del pedido, renderizado al vuelo (Satori) en cada request.
// No se sube ni se guarda en ningún lado — es puro cómputo, cero storage.
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Resumen de tu pedido — Top Gun Club';

const LOGO = 'https://res.cloudinary.com/dj5yikcc4/image/upload/v1781744683/Logo_cdzhn9.png';

// Satori (el renderer de next/og) no decodifica algunos WEBP de forma confiable
// (la imagen sale en blanco, sin error). Forzamos JPG vía Cloudinary para
// cualquier formato de origen, y de paso recortamos al tamaño exacto.
function thumb(url: string, px: number) {
  return url.replace('/upload/', `/upload/c_fill,w_${px},h_${px},f_jpg,q_auto/`);
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          // Foto actual del producto (el pedido no guarda su propia copia,
          // así que se toma la que tenga el producto en este momento).
          product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
        },
      },
    },
  });

  if (!order) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0A', color: '#6f7672', fontSize: 40,
        }}>
          Pedido no encontrado
        </div>
      ),
      { ...size }
    );
  }

  const visibleItems = order.items.slice(0, 3);
  const extraCount = order.items.length - visibleItems.length;

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#0A0A0A', padding: '40px 56px',
        fontFamily: 'Arial, sans-serif', color: '#fff',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} width={60} height={60} alt="" style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, display: 'flex' }}>TOP GUN CLUB</div>
            <div style={{ fontSize: 18, color: '#C99E66', letterSpacing: 3, display: 'flex' }}>PEDIDO N&deg; {order.number}</div>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,.12)', display: 'flex', marginBottom: 20 }} />

        {/* Cliente */}
        {order.customer && (
          <div style={{ fontSize: 22, color: '#e8ece9', marginBottom: 18, display: 'flex' }}>
            Cliente: {order.customer}
          </div>
        )}

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12, justifyContent: 'center' }}>
          {visibleItems.map((it) => {
            const img = it.product?.images[0]?.url;
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb(img, 112)} width={56} height={56} alt="" style={{ borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', width: 56, height: 56, borderRadius: 8, background: '#161816' }} />
                )}
                <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center', fontSize: 22 }}>
                  <div style={{ display: 'flex', color: '#e8ece9' }}>
                    {it.name} <span style={{ color: '#6f7672', marginLeft: 8, display: 'flex' }}>×{it.qty}</span>
                  </div>
                  <div style={{ display: 'flex', color: '#e8ece9', fontWeight: 700 }}>
                    {formatPrice(Number(it.price) * it.qty, order.currency)}
                  </div>
                </div>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div style={{ display: 'flex', fontSize: 18, color: '#6f7672', marginLeft: 72 }}>+{extraCount} producto{extraCount > 1 ? 's' : ''} más</div>
          )}
        </div>

        {/* Total */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 26, paddingTop: 26, borderTop: '2px solid #2E8B47',
        }}>
          <div style={{ display: 'flex', fontSize: 22, color: '#6f7672', letterSpacing: 2 }}>TOTAL</div>
          <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, color: '#4ade80' }}>
            {formatPrice(Number(order.total), order.currency)}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

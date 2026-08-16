import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

// /catalogo ahora es /tienda (tienda virtual con carrito y venta por WhatsApp)
export const metadata: Metadata = {
  title: 'Tienda · Armas, PCP y Equipamiento',
  description:
    'Tienda virtual de Top Gun Club Cochabamba: armas de fuego, rifles PCP, accesorios y regalos.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/tienda' },
};

export default function CatalogoRedirect() {
  permanentRedirect('/tienda');
}

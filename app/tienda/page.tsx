import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { toCategoryDTO, toProductDTO } from '@/lib/server-dto';
import StorePage from '@/components/store/StorePage';
import RevealObserver from '@/components/RevealObserver';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import CatalogoIntroClient from '@/components/CatalogoIntroClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tienda · Armas, PCP y Equipamiento',
  description:
    'Tienda virtual de Top Gun Club Cochabamba: armas de fuego, rifles PCP, accesorios y regalos. Agregá al carrito y pedí por WhatsApp.',
  keywords: ['venta de armas Bolivia', 'armería Cochabamba', 'rifles PCP Bolivia', 'pistolas Cochabamba', 'escopetas Bolivia', 'Hatsan Bolivia', 'tienda de armas Cochabamba'],
  alternates: { canonical: '/tienda' },
};

export default async function TiendaPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      include: { category: true, images: true },
    }),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tienda Top Gun Club',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        image: p.images[0]?.url,
        brand: { '@type': 'Brand', name: p.brand ?? 'Top Gun Club' },
        offers: {
          '@type': 'Offer',
          price: Number(p.price),
          priceCurrency: p.currency,
          availability: 'https://schema.org/InStock',
          seller: { '@id': 'https://topgunclub.com.bo/#negocio' },
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd name="Tienda" path="/tienda" />
      <CatalogoIntroClient />
      <RevealObserver />
      <StorePage
        products={products.map(toProductDTO)}
        categories={categories.map(toCategoryDTO)}
      />
    </>
  );
}

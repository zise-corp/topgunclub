import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import TacticalCursor from '@/components/TacticalCursor';
import { CartProvider } from '@/components/store/CartContext';

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// ✅ CORREGIDO: image y logo ahora apuntan a la versión CUADRADA (512x512)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  '@id': 'https://topgunclub.com.bo/#negocio',
  name: 'Top Gun Club SRL',
  alternateName: ['TG Club SRL', 'Top Gun Club Cochabamba'],
  description: 'Escuela y polígono de tiro deportivo bajo techo en Cochabamba, Bolivia. Cursos de armas de fuego, airsoft, rifles PCP, torneos, cumpleaños y eventos.',
  url: 'https://topgunclub.com.bo',
  telephone: '+59169500967',
  // ✅ CUADRADO 512x512 para Google (logo en resultados de búsqueda)
  image: 'https://topgunclub.com.bo/web-app-manifest-512x512.png',
  logo: {
    '@type': 'ImageObject',
    url: 'https://topgunclub.com.bo/web-app-manifest-512x512.png',
    width: 512,
    height: 512,
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Francisco Bedregal entre Lope de Vega y Mostajo, Zona Temporal',
    addressLocality: 'Cochabamba',
    addressCountry: 'BO',
  },
  hasMap: 'https://maps.google.com/maps?q=Top+Gun+Club+SRL+Cochabamba+Bolivia',
  // TODO: cuando haya horarios fijos, agregar openingHoursSpecification con opens/closes reales
  sameAs: [
    'https://www.facebook.com/topgunclubsrl/',
    'https://www.instagram.com/topgunclub_srl/',
    'https://www.tiktok.com/@top_gun_club',
  ],
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
};

// ✅ RECTANGULAR 1200x630 para redes sociales (OpenGraph)
const OG_IMAGE =
  'https://res.cloudinary.com/dj5yikcc4/image/upload/c_pad,w_1200,h_630,b_rgb:0A0A0A/v1781744683/Logo_cdzhn9.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://topgunclub.com.bo'),
  title: {
    default: 'Top Gun Club SRL · Polígono de Tiro en Cochabamba, Bolivia',
    template: '%s | Top Gun Club SRL',
  },
  applicationName: 'Top Gun Club SRL',
  keywords: [
    'polígono de tiro Cochabamba',
    'campo de tiro Cochabamba',
    'campo de tiro Bolivia',
    'tiro deportivo Cochabamba',
    'curso de tiro Cochabamba',
    'airsoft Cochabamba',
    'rifles PCP Bolivia',
    'clases de tiro Bolivia',
    'Top Gun Club',
    'Top Gun Club Cochabamba',
    'Campo de tiro deportivo Cochabamba',
    'Campo de tiro deportivo Bolivia',
    'Polígono de tiro deportivo Cochabamba',
    'Polígono de tiro deportivo Bolivia',
    'Disparo de airsoft Cochabamba',
    'Disparo de airsoft Bolivia',
    'Tiro deportivo con armas de fuego Cochabamba',
    'Tiro deportivo con armas de fuego Bolivia',
    'Tiro deportivo con rifles PCP Cochabamba',
    'Tiro deportivo con rifles PCP Bolivia',
    'Tiro deportivo con armas de fuego Bolivia',
    'Tiro deportivo con airsoft Bolivia',
    'Tiro deportivo con rifles PCP Bolivia',
    'Ley 400 Bolivia',
  ],
  category: 'sports',
  creator: 'ZISE',
  publisher: 'Top Gun Club SRL',
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // ✅ CORREGIDO: FAVICONS LOCALES (como ZISE)
  // Juego de íconos generado desde el logo (escudo central sobre el fondo
  // oscuro de la marca). El logo completo es 2.3:1 y, encajado en un cuadrado,
  // quedaba ilegible a 16-32px; el escudo se reconoce bien a ese tamaño.
  // favicon.ico lleva entradas BMP 16/32/48 por compatibilidad máxima.
  // Para que el favicon salga en los resultados de Google, el ícono debe ser
  // cuadrado y MÚLTIPLO DE 48px (48, 96, 144, 192…) — es un requisito explícito
  // de Google. Antes se declaraba un PNG de 512 (no es múltiplo de 48) y un SVG
  // de 212 KB, ambos con el logo BLANCO sobre fondo transparente: Google dibuja
  // el favicon sobre fondo blanco, así que quedaba invisible y mostraba el globo
  // genérico. Ahora todos los íconos llevan el fondo oscuro de la marca.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    locale: 'es_BO',
    type: 'website',
    siteName: 'Top Gun Club SRL',
    url: 'https://topgunclub.com.bo',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Top Gun Club SRL',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Gun Club SRL · Polígono de tiro Deportivo',
    description: 'El lugar perfecto para cualquier evento. Ambientes amplios, comida, tiro deportivo y más.',
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <CartProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </CartProvider>
        <TacticalCursor />
      </body>
    </html>
  );
}

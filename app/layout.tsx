import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingActions from '@/components/FloatingActions';
import TacticalCursor from '@/components/TacticalCursor';

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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  '@id': 'https://topgunclub.com.bo/#negocio',
  name: 'Top Gun Club SRL',
  alternateName: ['TG Club SRL', 'Top Gun Club Cochabamba'],
  description: 'Escuela y polígono de tiro deportivo bajo techo en Cochabamba, Bolivia. Cursos de armas de fuego, airsoft, rifles PCP, torneos, cumpleaños y eventos.',
  url: 'https://topgunclub.com.bo',
  telephone: '+59169500967',
  image: 'https://res.cloudinary.com/dj5yikcc4/image/upload/c_pad,w_1200,h_630,b_rgb:0A0A0A/v1781744683/Logo_cdzhn9.png',
  logo: 'https://res.cloudinary.com/dj5yikcc4/image/upload/v1781744683/Logo_cdzhn9.png',
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

const OG_IMAGE =
  'https://res.cloudinary.com/dj5yikcc4/image/upload/c_pad,w_1200,h_630,b_rgb:0A0A0A/v1781744683/Logo_cdzhn9.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://topgunclub.com.bo'),
  title: {
    default: 'Top Gun Club SRL · Polígono de Tiro en Cochabamba, Bolivia',
    template: '%s | Top Gun Club SRL', // ✅ CORREGIDO: Antes era '%s'
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
  // ✅ ELIMINADO: El bloque 'icons' se quitó para que Next.js use automáticamente el archivo 'app/icon.png'
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
        <Navbar />
        {children}
        <Footer />
        <FloatingActions />
        <TacticalCursor />
      </body>
    </html>
  );
}
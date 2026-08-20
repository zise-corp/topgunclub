'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingActions from './FloatingActions';

// ─────────────────────────────────────────────────────────────────────────────
// Cabecera/pie públicos del sitio. En /admin no se muestran: el panel es una
// herramienta de trabajo con su propia navegación, y la barra pública le
// robaba altura y contexto. El regreso al sitio queda en la barra lateral.
// ─────────────────────────────────────────────────────────────────────────────

function useIsAdmin() {
  const pathname = usePathname();
  return pathname?.startsWith('/admin') ?? false;
}

export function SiteHeader() {
  const isAdmin = useIsAdmin();
  return isAdmin ? null : <Navbar />;
}

export function SiteFooter() {
  const isAdmin = useIsAdmin();
  if (isAdmin) return null;
  return (
    <>
      <Footer />
      <FloatingActions />
    </>
  );
}

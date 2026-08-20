'use client';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { NAV_ITEMS, waLink } from '@/lib/site';
import Icon from './Icon';
import CartDrawer from './store/CartDrawer';
import { useCart } from './store/CartContext';
import { useScrollLock } from '@/hooks/useScrollLock';

// Collect all anchor IDs from nav children (e.g. "#airsoft" from "/cursos#airsoft")
const SECTION_IDS = NAV_ITEMS.flatMap(it =>
  (it.children ?? [])
    .filter(c => c.href.includes('#'))
    .map(c => c.href.split('#')[1])
);

// Lee los parámetros de la URL (?cat=...) y los reporta al navbar. Va aislado
// dentro de un <Suspense> porque useSearchParams obliga a ello: si se llamara
// directo en el Navbar, que vive en el layout raíz, Next sacaría del
// prerenderizado estático a todas las páginas del sitio. Como no pinta nada,
// el fallback vacío no produce ningún salto visual.
function SearchParamsSync({ onChange }: { onChange: (value: string) => void }) {
  const sp = useSearchParams();
  const value = sp.toString();
  useEffect(() => { onChange(value); }, [value, onChange]);
  return null;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [hash, setHash] = useState('');
  // Query actual ("cat=productos"), para marcar la categoría activa del menú.
  const [search, setSearch] = useState('');
  // Categorías reales de la tienda: antes estaban fijas en lib/site.ts, así que
  // las que el admin creaba no aparecían en el menú.
  const [storeCats, setStoreCats] = useState<{ name: string; slug: string }[] | null>(null);
  const pathname = usePathname();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { count: cartCount } = useCart();

  // Sync hash on route change
  useEffect(() => {
    setHash(window.location.hash);
  }, [pathname]);

  // Se piden en el cliente para no volver dinámicas todas las páginas del
  // sitio: el layout es un server component y una consulta ahí quitaría el
  // prerenderizado estático de home, cursos, eventos, etc.
  useEffect(() => {
    let cancel = false;
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categories?: { name: string; slug: string }[] } | null) => {
        if (!cancel && d?.categories) setStoreCats(d.categories);
      })
      .catch(() => { /* si falla, queda el menú estático de lib/site.ts */ });
    return () => { cancel = true; };
  }, []);

  // IntersectionObserver: auto-detect active section while scrolling
  useEffect(() => {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
    const margin = -(navH + 16);

    // Track which sections are currently intersecting
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        });

        if (visible.size === 0) return;

        // Pick the section whose top is closest to (and below) the navbar
        const active = [...visible.entries()].reduce((a, b) =>
          Math.abs(a[1]) < Math.abs(b[1]) ? a : b
        );
        setHash(`#${active[0]}`);
      },
      {
        rootMargin: `${margin}px 0px -40% 0px`,
        threshold: 0,
      }
    );

    SECTION_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [pathname]);

  // hashchange for back/forward navigation
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mismo hook que el carrito: usa un contador compartido, así cerrar un panel
  // no libera el scroll si el otro sigue abierto.
  useScrollLock(open);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Menú final: igual al de lib/site.ts, pero con las categorías de Tienda
  // reemplazadas por las que existen de verdad en la base de datos.
  const navItems = useMemo(() => {
    if (!storeCats) return NAV_ITEMS;
    return NAV_ITEMS.map((it) =>
      it.href === '/tienda'
        ? {
            ...it,
            children: storeCats.map((c) => ({
              label: c.name,
              href: `/tienda?cat=${c.slug}`,
            })),
          }
        : it
    );
  }, [storeCats]);

  const isActive = (href: string) => {
    if (href.includes('#')) {
      const [path, h] = href.split('#');
      return pathname === path && hash === `#${h}`;
    }
    // Enlaces con query (/tienda?cat=productos): usePathname no incluye el
    // "?cat=...", así que hay que compararlo aparte.
    if (href.includes('?')) {
      const [path, qs] = href.split('?');
      return pathname === path && search === qs;
    }
    return pathname === href && hash === '' && search === '';
  };

  const isParentActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) ?? false;
  };

  // Cierra el drawer y luego hace scroll al anchor (evita conflicto con animación)
  const handleDrawerNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hasHash = href.includes('#');
    if (!hasHash) { setOpen(false); return; }
    e.preventDefault();
    setOpen(false);
    const [path, hash] = href.split('#');
    const currentPath = window.location.pathname;
    const navigateAndScroll = () => {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
          const top = el.getBoundingClientRect().top + window.scrollY - navH - 16;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 60);
    };
    if (currentPath === path || (path === '' && currentPath === '/')) {
      navigateAndScroll();
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsSync onChange={setSearch} />
      </Suspense>

      <nav className={'nav' + (scrolled ? ' scrolled' : '')}>
        <div className="container">
          <Link className="nav__brand" href="/" aria-label="Top Gun Club inicio">
            <Image
              src="/images/logoTopGunClub.png"
              alt="Top Gun Club"
              height={1024}
              width={1536}
              quality={100}
              style={{ width: 'auto', height: '52px', maxHeight: 'none', display: 'block', marginTop: '3px' }}
              priority
            />
          </Link>

          <div className="nav__links">
            {navItems.map(it => {
              if (it.children) {
                return (
                  <div
                    key={it.label}
                    className="nav__dropdown"
                    style={{ position: 'relative' }}
                    onMouseEnter={e => {
                      const menu = e.currentTarget.querySelector('.dropdown-menu') as HTMLElement;
                      if (menu) { menu.style.opacity = '1'; menu.style.visibility = 'visible'; menu.style.transform = 'translateY(0)'; }
                    }}
                    onMouseLeave={e => {
                      const menu = e.currentTarget.querySelector('.dropdown-menu') as HTMLElement;
                      if (menu) { menu.style.opacity = '0'; menu.style.visibility = 'hidden'; menu.style.transform = 'translateY(10px)'; }
                    }}
                  >
                    <Link href={it.href} className={isParentActive(it) ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {it.label}
                      <Icon name="chevron" style={{ width: 14, height: 14 }} />
                    </Link>
                    <div
                      className="dropdown-menu"
                      style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                        background: 'var(--bg)', border: '1px solid var(--line)',
                        borderRadius: '8px', padding: '8px 0', minWidth: '200px',
                        opacity: 0, visibility: 'hidden', transform: 'translateY(10px)',
                        transition: 'all 0.2s ease', zIndex: 100,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      }}
                    >
                      {it.children.map(child => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '10px 20px', fontSize: '0.9rem',
                              color: childActive ? 'var(--green-bright)' : 'var(--faint)',
                              background: childActive ? 'var(--green-deep)' : 'transparent',
                              textDecoration: 'none', transition: 'background 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => {
                              if (!childActive) { e.currentTarget.style.background = 'var(--green-deep)'; e.currentTarget.style.color = 'var(--green-bright)'; }
                            }}
                            onMouseLeave={e => {
                              if (!childActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--faint)'; }
                            }}
                          >
                            {childActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green-bright)', flexShrink: 0 }} />}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <Link key={it.label} href={it.href} className={isActive(it.href) ? 'active' : ''}>
                  {it.label}
                </Link>
              );
            })}
          </div>

          <div className="nav__cta">
            <button
              type="button"
              className={'nav__cart' + (cartCount > 0 ? ' has-items' : '')}
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir carrito (${cartCount} ítems)`}
            >
              <Icon name="cart" style={{ width: 20, height: 20 }} />
              {cartCount > 0 && <span className="nav__cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
            </button>
            <button
              className={'nav__burger' + (open ? ' open' : '')}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen(o => !o)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      <div className={'drawer' + (open ? ' open' : '')} aria-hidden={!open}>
        {navItems.map(it => {
          if (it.children) {
            return (
              <div key={it.label} style={{ padding: '0 0 0 16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--green-bright)' }}>{it.label}</div>
                {it.children.map(child => (
                  <a key={child.label} href={child.href}
                    onClick={e => handleDrawerNav(e, child.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: '0.95rem', color: isActive(child.href) ? 'var(--green-bright)' : 'var(--faint)', textDecoration: 'none' }}>
                    {isActive(child.href) && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green-bright)', flexShrink: 0 }} />}
                    {child.label} {!isActive(child.href) && <span>›</span>}
                  </a>
                ))}
              </div>
            );
          }
          return (
            <a key={it.label} href={it.href}
              onClick={e => handleDrawerNav(e, it.href)}
              style={{ display: 'block', padding: '12px 0', textDecoration: 'none', color: isActive(it.href) ? 'var(--green-bright)' : 'inherit' }}>
              {it.label} <span>›</span>
            </a>
          );
        })}
        <a
          href={waLink('Hola! Quiero reservar / consultar en Top Gun Club')}
          target="_blank" rel="noopener noreferrer"
          className="btn btn--wa btn--lg btn--block"
          onClick={() => setOpen(false)}
        >
          <Icon name="whatsapp" /> Reservar por WhatsApp
        </a>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

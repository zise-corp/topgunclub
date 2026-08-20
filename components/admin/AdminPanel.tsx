'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon, { type IconName } from '@/components/Icon';
import DashboardView from './DashboardView';
import ProductManager from './ProductManager';
import CategoryManager from './CategoryManager';
import OrdersManager from './OrdersManager';

// ─────────────────────────────────────────────────────────────────────────────
// Panel de administración: login + layout con navegación lateral.
// Vistas: Resumen, Productos, Categorías, Pedidos.
// ─────────────────────────────────────────────────────────────────────────────

type User = { id: string; email: string; name: string; role: string };
type View = 'resumen' | 'productos' | 'categorias' | 'pedidos';

const NAV: { id: View; label: string; icon: IconName; hint: string }[] = [
  { id: 'resumen', label: 'Resumen', icon: 'chart', hint: 'Métricas y últimos pedidos' },
  { id: 'productos', label: 'Productos', icon: 'package', hint: 'Catálogo de la tienda' },
  { id: 'categorias', label: 'Categorías', icon: 'tag', hint: 'Agrupación de productos' },
  { id: 'pedidos', label: 'Pedidos', icon: 'cart', hint: 'Ventas por WhatsApp' },
];

export default function AdminPanel() {
  const [status, setStatus] = useState<'loading' | 'anon' | 'auth'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('resumen');
  const [navOpen, setNavOpen] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { user: User };
        setUser(data.user);
        setStatus('auth');
        return;
      }
    } catch {
      // sin sesión: se muestra el login
    }
    setStatus('anon');
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setStatus('anon');
  };

  const go = (v: View) => {
    setView(v);
    setNavOpen(false);
  };

  if (status === 'loading') {
    return (
      <main className="admin">
        <div className="admin-boot">
          <span className="admin-boot__spin" aria-hidden />
          <p>Cargando panel…</p>
        </div>
      </main>
    );
  }

  if (status === 'anon') return <AdminLogin onLogin={checkSession} />;

  const current = NAV.find((n) => n.id === view)!;
  const initials = (user?.name ?? 'A')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <main className="admin admin--shell">
      {/* ── Barra lateral ─────────────────────────────────────────────── */}
      <aside className={'admin-side' + (navOpen ? ' open' : '')}>
        <div className="admin-side__brand">
          <Image
            src="/images/logoTopGunClub.png"
            alt="Top Gun Club"
            width={1536}
            height={1024}
            style={{ width: 'auto', height: 34 }}
          />
          <span>Panel</span>
        </div>

        <nav className="admin-side__nav" aria-label="Secciones del panel">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={'admin-navbtn' + (view === n.id ? ' active' : '')}
              onClick={() => go(n.id)}
              aria-current={view === n.id ? 'page' : undefined}
            >
              <Icon name={n.icon} style={{ width: 18, height: 18 }} />
              <span className="admin-navbtn__text">
                <b>{n.label}</b>
                <small>{n.hint}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="admin-side__foot">
          <div className="admin-side__links">
            <Link href="/" className="admin-side__store">
              <Icon name="up" style={{ width: 15, height: 15, transform: 'rotate(-90deg)' }} /> Volver al sitio
            </Link>
            <Link href="/tienda" className="admin-side__store">
              <Icon name="cart" style={{ width: 15, height: 15 }} /> Ver la tienda
            </Link>
          </div>
          <div className="admin-side__user">
            <span className="admin-avatar" aria-hidden>{initials}</span>
            <span className="admin-side__id">
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </span>
          </div>
          <button type="button" className="admin-side__logout" onClick={handleLogout}>
            <Icon name="logout" style={{ width: 15, height: 15 }} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Fondo oscuro detrás del menú lateral en móvil */}
      {navOpen && <div className="admin-side__scrim" onClick={() => setNavOpen(false)} aria-hidden />}

      {/* ── Contenido ─────────────────────────────────────────────────── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__burger"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Abrir menú del panel"
          >
            <span /><span /><span />
          </button>
          <div className="admin-topbar__title">
            <span className="eyebrow">Panel de administración</span>
            <h1>{current.label}</h1>
          </div>
          <Link href="/" className="admin-topbar__store" aria-label="Volver al sitio">
            <Icon name="up" style={{ width: 18, height: 18, transform: 'rotate(-90deg)' }} />
          </Link>
        </header>

        <div className="admin-content">
          {view === 'resumen' && (
            <DashboardView onGoToOrders={() => go('pedidos')} onGoToProducts={() => go('productos')} />
          )}
          {view === 'productos' && <ProductManager />}
          {view === 'categorias' && <CategoryManager />}
          {view === 'pedidos' && <OrdersManager />}
        </div>
      </div>
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? 'No se pudo iniciar sesión');
      }
    } catch {
      setError('Error de conexión. Intentalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin">
      <section className="admin-login">
        <form className="admin-login__card" onSubmit={submit}>
          {/* Esquinas tácticas — mismo motivo que el detalle de producto */}
          <span className="admin-login__corner tl" aria-hidden />
          <span className="admin-login__corner tr" aria-hidden />
          <span className="admin-login__corner bl" aria-hidden />
          <span className="admin-login__corner br" aria-hidden />

          <div className="admin-login__logo">
            <Image
              src="/images/logoTopGunClub.png"
              alt="Top Gun Club"
              width={1536}
              height={1024}
              style={{ width: 'auto', height: 44 }}
              priority
            />
          </div>
          <h1>Acceso administrador</h1>
          <p>Gestión de la tienda: productos, categorías y pedidos.</p>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@topgunclub.bo"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <div className="admin-login__password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-login__password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>

          {error && <p className="admin-error">{error}</p>}

          <button type="submit" className="btn btn--wa btn--lg btn--block" disabled={busy}>
            {busy ? 'Iniciando sesión…' : 'Iniciar Sesión'}
          </button>

          <Link href="/" className="admin-login__back">
            ← Volver al sitio
          </Link>
        </form>
      </section>
    </main>
  );
}

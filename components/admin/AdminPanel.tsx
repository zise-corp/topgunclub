'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import ProductManager from './ProductManager';
import CategoryManager from './CategoryManager';
import OrdersManager from './OrdersManager';

// ─────────────────────────────────────────────────────────────────────────────
// Panel de administración: login + pestañas (Productos, Categorías, Pedidos)
// ─────────────────────────────────────────────────────────────────────────────

type User = { id: string; email: string; name: string; role: string };
type View = 'productos' | 'categorias' | 'pedidos';

export default function AdminPanel() {
  const [status, setStatus] = useState<'loading' | 'anon' | 'auth'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('productos');

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

  if (status === 'loading') {
    return (
      <main className="admin">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
          <p className="admin-loading">Cargando panel…</p>
        </div>
      </main>
    );
  }

  if (status === 'anon') {
    return <AdminLogin onLogin={checkSession} />;
  }

  const tabs: { id: View; label: string; icon: 'package' | 'tag' | 'cart' }[] = [
    { id: 'productos', label: 'Productos', icon: 'package' },
    { id: 'categorias', label: 'Categorías', icon: 'tag' },
    { id: 'pedidos', label: 'Pedidos', icon: 'cart' },
  ];

  return (
    <main className="admin">
      <section className="admin-head grain">
        <div className="container">
          <div className="admin-head__row">
            <div>
              <span className="eyebrow">Panel de administración</span>
              <h1 className="display" style={{ fontSize: '2.2rem' }}>
                TIENDA <span className="hl">· ADMIN</span>
              </h1>
            </div>
            <div className="admin-head__user">
              <span>
                {user?.name} <small>{user?.email}</small>
              </span>
              <button type="button" className="btn btn--ghost" onClick={handleLogout}>
                <Icon name="logout" style={{ width: 15, height: 15 }} /> Salir
              </button>
            </div>
          </div>
          <nav className="admin-tabs" aria-label="Secciones">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'admin-tab' + (view === t.id ? ' active' : '')}
                onClick={() => setView(t.id)}
              >
                <Icon name={t.icon} style={{ width: 16, height: 16 }} />
                {t.label}
              </button>
            ))}
            <Link href="/tienda" className="admin-tab admin-tab--link">
              Ver tienda →
            </Link>
          </nav>
        </div>
      </section>

      <section className="admin-body">
        <div className="container">
          {view === 'productos' && <ProductManager />}
          {view === 'categorias' && <CategoryManager />}
          {view === 'pedidos' && <OrdersManager />}
        </div>
      </section>
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <div className="admin-login__logo">
            <Icon name="shield" style={{ width: 34, height: 34 }} />
          </div>
          <h1>Acceso administrador</h1>
          <p>Ingresá para gestionar la tienda: productos, categorías y pedidos.</p>

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="admin-error">{error}</p>}

          <button type="submit" className="btn btn--wa btn--lg btn--block" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>

          <Link href="/" className="admin-login__back">
            ← Volver al sitio
          </Link>
        </form>
      </section>
    </main>
  );
}

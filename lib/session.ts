import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Glue de sesión para Server Components / Route Handlers (Next 15)
// ─────────────────────────────────────────────────────────────────────────────

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
}

/** Devuelve el usuario admin autenticado o null (los route handlers responden 401). */
export async function requireAdmin() {
  return getSessionUser();
}

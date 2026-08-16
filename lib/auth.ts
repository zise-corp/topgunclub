import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────────────────────────────────────
// Autenticación de administradores
// Sesión: cookie firmada con HMAC-SHA256 (stateless, sin tablas de sesión)
// Contraseñas: bcrypt (hash con salt)
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = 'tgc_admin_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Solo en desarrollo: fallback seguro para arranque. En producción SESSION_SECRET es obligatorio.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET no está configurado. Definilo en .env.local');
    }
    return 'dev-only-secret-do-not-use-in-production';
  }
  return secret;
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url');
}

export type SessionPayload = { uid: string; exp: number };

export function createSessionToken(uid: string): string {
  const payload: SessionPayload = { uid, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(sig);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

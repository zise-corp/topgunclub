import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Respuesta genérica para no revelar si el email existe
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Email o contraseña incorrectos' },
      { status: 401 }
    );
  }

  const token = createSessionToken(user.id);
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}

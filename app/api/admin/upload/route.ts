import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { cloudinaryConfigured, uploadImageBuffer } from '@/lib/cloudinary-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Cloudinary no está configurado. Revisá las variables NEXT_PUBLIC_CLOUDINARY_* y CLOUDINARY_API_SECRET en .env.local' },
      { status: 500 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formulario inválido' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `Formato no permitido (${file.type || 'desconocido'}). Usá JPG, PNG, WEBP, GIF o AVIF.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera los 10 MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { url, publicId } = await uploadImageBuffer(buffer, file.name || 'imagen');
    return NextResponse.json({ url, publicId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al subir la imagen';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { v2 as cloudinary } from 'cloudinary';

// ─────────────────────────────────────────────────────────────────────────────
// Subida de imágenes a Cloudinary (server-side, usa la API key/secret)
// ─────────────────────────────────────────────────────────────────────────────

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function getConfig() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export function slugifyId(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'imagen';
}

export type UploadResult = { url: string; publicId: string };

/** Sube un buffer de imagen a Cloudinary (carpeta `tienda`). */
export async function uploadImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  if (!cloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado. Revisá NEXT_PUBLIC_CLOUDINARY_* en .env.local');
  }
  const cloud = getConfig();
  const publicId = `${Date.now()}-${slugifyId(filename)}`;

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(
      {
        folder: 'tienda',
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error('Error al subir la imagen a Cloudinary'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

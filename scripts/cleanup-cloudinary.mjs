// Elimina assets de prueba de Cloudinary (verificación)
import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}

cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const publicIds = process.argv.slice(2);
if (publicIds.length === 0) {
  console.log('Uso: node scripts/cleanup-cloudinary.mjs <publicId...>');
  process.exit(0);
}

const result = await cloudinary.api.delete_resources(publicIds);
console.log('Eliminados de Cloudinary:', JSON.stringify(result.deleted));

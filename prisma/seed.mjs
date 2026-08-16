// ─────────────────────────────────────────────────────────────────────────────
// Seed de la tienda Top Gun Club
// - Categorías base (Armas de Fuego, PCP, Productos, Regalos)
// - Productos migrados del catálogo anterior (prisma/seed-data.json)
// - Usuario administrador inicial
// Uso: npx prisma db seed
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8');
  const data = JSON.parse(raw);

  // ── Categorías ────────────────────────────────────────────────────────────
  const categories = new Map();
  for (const cat of data.categories) {
    const saved = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: cat,
    });
    categories.set(cat.slug, saved.id);
    console.log(`Categoría: ${saved.name} (${saved.slug})`);
  }

  // ── Productos (upsert por slug: re-ejecutable sin duplicar) ──────────────
  let created = 0;
  let updated = 0;
  for (const p of data.products) {
    const categoryId = categories.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`Saltando "${p.name}": categoría ${p.categorySlug} inexistente`);
      continue;
    }
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const common = {
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      categoryId,
      kind: p.kind,
      brand: p.brand,
      caliber: p.caliber,
      firearmType: p.firearmType,
      specsJson: JSON.stringify(p.specs),
      active: true,
    };
    const images = p.images.map((url, i) => ({ url, alt: p.name, sortOrder: i }));
    if (existing) {
      await prisma.product.update({
        where: { slug: p.slug },
        data: { ...common, images: { deleteMany: {}, create: images } },
      });
      updated++;
    } else {
      await prisma.product.create({
        data: { ...common, slug: p.slug, images: { create: images } },
      });
      created++;
    }
  }
  console.log(`Productos: ${created} creados, ${updated} actualizados`);

  // ── Usuario administrador ─────────────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@topgunclub.bo').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'TopgunClub2026!';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`Admin existente: ${existingAdmin.email} (sin cambios)`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: { email: adminEmail, name: 'Administrador', passwordHash },
    });
    console.log(`Admin creado: ${adminEmail}`);
    console.log(`  Contraseña: ${adminPassword}  → ¡CAMBIALA en producción! (env ADMIN_PASSWORD)`);
  }

  console.log('\nSeed completado ✅');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

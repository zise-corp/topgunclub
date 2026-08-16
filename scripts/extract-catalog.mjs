// ─────────────────────────────────────────────────────────────────────────────
// Extrae los productos del catálogo actual (app/catalogo/page.tsx) y genera
// prisma/seed-data.json con la transformación a los nuevos modelos.
// Uso: node scripts/extract-catalog.mjs
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'app', 'catalogo', 'page.tsx');
const OUT = path.join(process.cwd(), 'prisma', 'seed-data.json');

const src = fs.readFileSync(SRC, 'utf8');

/** Extrae el literal de un array JS (`const NAME = [...]`) respetando strings y anidación. */
function extractArrayLiteral(name) {
  const start = src.indexOf(`const ${name} =`);
  if (start === -1) throw new Error(`No se encontró const ${name}`);
  const open = src.indexOf('[', start);
  let depth = 0;
  let inStr = null;
  let i = open;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error(`Array ${name}: no cerró correctamente`);
  const literal = src.slice(open, i + 1);
  // eval seguro: el literal es código puro de datos del propio repo
  return Function(`"use strict"; return (${literal});`)();
}

const FIREARMS = extractArrayLiteral('FIREARMS');
const PCP_WEAPONS = extractArrayLiteral('PCP_WEAPONS');

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildProducts() {
  const products = [];

  for (const section of FIREARMS) {
    for (const item of section.items) {
      const specs = { ...item.specs };
      const caliber = specs.Calibre ?? null;
      const firearmType = specs.Tipo ?? null;
      delete specs.Calibre;
      delete specs.Tipo;
      specs.Grupo = section.category; // conserva la subcategoría original
      products.push({
        name: item.name,
        slug: slugify(item.name),
        price: item.price,
        currency: 'USD',
        categorySlug: 'armas-de-fuego',
        kind: 'arma',
        brand: item.brand,
        caliber,
        firearmType,
        specs,
        description: buildDescription(item.name, item.brand, firearmType, caliber, specs),
        images: [item.image],
      });
    }
  }

  for (const section of PCP_WEAPONS) {
    for (const item of section.items) {
      const specs = { ...item.specs };
      const isAccesorio = section.category === 'Accesorios';
      const caliber = specs.Calibre ?? null;
      const firearmType = specs.Operación ?? specs.Tipo ?? null;
      delete specs.Calibre;
      delete specs.Operación;
      delete specs.Tipo;
      specs.Grupo = section.category;
      products.push({
        name: item.name,
        slug: slugify(item.name),
        price: item.price,
        currency: 'USD',
        categorySlug: isAccesorio ? 'productos' : 'pcp',
        kind: isAccesorio ? 'producto' : 'arma',
        brand: isAccesorio ? null : 'HATSAN',
        caliber: isAccesorio ? null : caliber,
        firearmType: isAccesorio ? null : firearmType,
        specs,
        description: buildDescription(item.name, 'HATSAN', firearmType, caliber, specs, isAccesorio),
        images: [item.image],
      });
    }
  }

  return products;
}

function buildDescription(name, brand, tipo, calibre, specs, isAccesorio = false) {
  if (isAccesorio) {
    return `${name} — accesorio disponible en la tienda de Top Gun Club Cochabamba.`;
  }
  const parts = [`${name} de ${brand ?? 'Top Gun Club'}`];
  if (tipo) parts.push(tipo.toLowerCase());
  if (calibre) parts.push(`calibre ${calibre}`);
  const grupo = specs.Grupo ? ` · ${specs.Grupo}` : '';
  return `Arma de ${brand === 'HATSAN' ? 'aire comprimido' : 'fuego'}${grupo}. ${parts.join(', ')}. Disponible en Top Gun Club Cochabamba, Bolivia.`;
}

const data = {
  categories: [
    { name: 'Armas de Fuego', slug: 'armas-de-fuego', description: 'Pistolas, rifles y escopetas de las mejores marcas.', sortOrder: 1 },
    { name: 'PCP', slug: 'pcp', description: 'Rifles de aire pre-comprimido de alta precisión.', sortOrder: 2 },
    { name: 'Productos', slug: 'productos', description: 'Accesorios y equipamiento.', sortOrder: 3 },
    { name: 'Regalos', slug: 'regalos', description: 'Ideas para regalar experiencia y equipamiento.', sortOrder: 4 },
  ],
  products: buildProducts(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');
console.log(`OK: ${data.products.length} productos extraídos → prisma/seed-data.json`);

# Top Gun Club SRL — Next.js

Sitio web de **Top Gun Club SRL**, escuela y polígono de tiro deportivo en Cochabamba, Bolivia.
Migrado de HTML + React CDN a Next.js 15 (App Router) con TypeScript.

## Requisitos

- Node.js 18.18+ (LTS recomendado)

## Cómo correrlo

```bash
npm install
npm run db:migrate   # desarrollo: crea/aplica migraciones en PostgreSQL
npm run db:deploy    # producción: aplica migraciones pendientes
npm run db:seed      # primera vez: carga categorías, 40 productos y el admin
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm start            # servidor de producción
```

> El seed usa los datos del catálogo anterior (extraídos a `prisma/seed-data.json` con
> `node scripts/extract-catalog.mjs`). Es re-ejecutable sin duplicar productos.

## Tienda virtual (tienda)

La sección `/tienda` reemplaza al antiguo catálogo (`/catalogo` redirige a `/tienda`) y funciona
como una tienda virtual con **gestión de venta por WhatsApp**:

- **Productos**: armas (industria, calibre, tipo + especificaciones) y productos/regalos
  (título, descripción, precio, imágenes múltiples), organizados por **categorías**
  (Armas de Fuego, PCP, Productos, Regalos…).
- **Carrito**: se agrega al carrito (persistido en el navegador) y al confirmar el pedido se
  registra en la base de datos y se abre WhatsApp con el detalle (ítems, cantidades, total,
  nombre, teléfono y nota) hacia `WA_PHONE` (`lib/site.ts`).
- **Panel de administración** (`/admin`): con login, permite crear/editar/eliminar productos
  (subiendo las imágenes a Cloudinary), gestionar categorías y ver/cambiar el estado de los
  pedidos (recibido → en proceso → completado/cancelado).

### Acceso admin

Credenciales por defecto del seed (¡cambialas en producción!):

- Email: `ADMIN_EMAIL` (por defecto `admin@topgunclub.bo`)
- Contraseña: `ADMIN_PASSWORD` (por defecto `TopgunClub2026!`)

### Base de datos

- **Prisma + PostgreSQL/Supabase**. Schema en `prisma/schema.prisma`
  (AdminUser, Category, Product, ProductImage, Order, OrderItem).
- Comandos: `npm run db:migrate` (migraciones), `npm run db:seed`, `npm run db:studio`.
- Las imágenes se suben a **Cloudinary** (carpeta `tienda`) vía `POST /api/admin/upload`
  (requiere sesión admin). Las claves van en `.env.local`.

### Variables de entorno

Crear `.env.local` (no se versiona). Variables requeridas:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
DATABASE_URL=<URL pooled de PostgreSQL/Supabase para runtime>
DIRECT_URL=<URL directa de PostgreSQL/Supabase para migraciones>
SESSION_SECRET=<valor aleatorio largo>
ADMIN_EMAIL=admin@topgunclub.bo
ADMIN_PASSWORD=<contraseña>
```

En Docker, `.env.local` se inyecta al ejecutar el contenedor mediante
`docker-compose.yml`; nunca se copia dentro de la imagen.

## Dónde editar el contenido

### Precios
Abrí `app/cursos/page.tsx` y buscá el array `PLANES`. Cada plan tiene un campo `amt` mostrado como `Bs —`.
Reemplazá `Bs —` en el JSX de pricing por el precio real (ej. `Bs 350`).

### Horarios
En `app/contacto/page.tsx`, buscá `"Lunes a Domingo · horario editable"` y reemplazá con los horarios reales.
El mismo texto aparece en el `Footer` (`components/Footer.tsx`).

### Dirección exacta
En `app/contacto/page.tsx`, buscá `"dirección exacta editable"` y reemplazá con la dirección real.
Para el mapa embebido, actualizá el `src` del `<iframe>` con el link de embed de Google Maps de la dirección exacta.

### Número de WhatsApp / teléfono
Editá `lib/site.ts` → `WA_PHONE` (solo dígitos, sin +) y `PHONE_DISPLAY`.

### Redes sociales
Editá `lib/site.ts` → objeto `SOCIALS`.

### Datos del JSON-LD (SEO)
Editá el objeto `jsonLd` en `app/layout.tsx` (nombre, descripción, dirección).

## Dónde reemplazar las fotos placeholder

### Imágenes de servicios y splits (ya están con next/image)
- **Escuela de tiro** → `/public/assets/piece-escuela.png` (reemplazá el archivo)
- **Curso experto** → `/public/assets/piece-experto.png` (reemplazá el archivo)

### Galería de fotos
Abrí `components/GaleriaClient.tsx`. El array `ITEMS` define los placeholders de la galería.
Para cada ítem que quieras reemplazar con una foto real, cambiá el `<Ph label={...}>` por un `<Image>` de Next.js:
```tsx
// Antes (placeholder)
<Ph label={it.label} style={{ height: it.h + 'px' }} />

// Después (foto real)
<Image src={`/assets/galeria/${it.label}.jpg`} alt={it.label} width={600} height={it.h} style={{ objectFit: 'cover', width: '100%' }} />
```
Colocá las fotos en `/public/assets/galeria/`.

### Logos
- `/public/assets/logo.png` — logo principal (usado como favicon)
- `/public/assets/logo-white.png` — logo blanco (Navbar y Footer)

### Hero y páginas interiores
Los héroes de páginas interiores (`PageHero`) usan el componente `<Ph>` como fondo. Para reemplazarlos,
editá `components/PageHero.tsx` y sustituí el `<Ph>` por un `<Image fill>` con la foto real.

## Estadísticas editables

En `components/Stats.tsx`, el array `STATS` contiene los números animados:
- `to={8}` → años
- `to={1200}` → alumnos
- `to={3900}` → seguidores
- `to={6}` → calibres

## Estructura del proyecto

```
app/            → páginas (una carpeta por ruta: /, /tienda, /admin, /cursos…)
  api/          → Route Handlers: auth, admin (productos/categorías/pedidos/upload), orders
components/     → componentes reutilizables
  store/        → tienda: CartContext, StorePage, ProductModal, CartDrawer, CartFab…
  admin/        → panel: AdminPanel, ProductManager, CategoryManager, OrdersManager
hooks/          → useReveal (IntersectionObserver para animaciones)
lib/            → site.ts, db.ts (Prisma), auth.ts (sesiones), store-types.ts, validators.ts…
prisma/         → schema.prisma, migraciones, seed.mjs + seed-data.json
scripts/        → extract-catalog.mjs (migra datos del catálogo viejo), cleanup-cloudinary.mjs
public/assets/  → imágenes estáticas
```

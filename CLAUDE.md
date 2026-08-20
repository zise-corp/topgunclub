# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server (Next.js, port 3000)
npm run build       # Production build
npm run lint        # ESLint via next lint (flat config: eslint.config.mjs)
npm run db:migrate  # Prisma migrations (applies to the Postgres/Supabase database)
npm run db:seed     # Seed: categories, products (prisma/seed-data.json), admin user
npm run db:studio   # Prisma Studio (visual DB editor)
node scripts/extract-catalog.mjs  # Regenera prisma/seed-data.json desde datos del catálogo viejo
```

No test suite is configured.

## Architecture

Next.js 15 (App Router) site for **Top Gun Club SRL** — an indoor shooting range in Cochabamba, Bolivia. React 19, TypeScript, no CSS framework (plain CSS via `globals.css`).

### Key directories

- `app/` — pages using App Router. Each route has its own `page.tsx` with `export const metadata` for SEO. Routes: `/`, `/cursos`, `/eventos`, `/tienda`, `/galeria`, `/contacto`, `/admin`. `/catalogo` redirects permanently to `/tienda`.
- `app/api/` — Route Handlers (Node runtime):
  - `auth/login|logout|me` — admin session (HMAC-signed cookie + bcrypt).
  - `admin/products`, `admin/products/[id]` — CRUD productos.
  - `admin/categories`, `admin/categories/[id]` — CRUD categorías.
  - `admin/upload` — subida de imágenes a Cloudinary (multipart, sesión admin).
  - `admin/orders`, `admin/orders/[id]` — listado y cambio de estado de pedidos.
  - `orders` — público: registra un pedido cuando el carrito confirma por WhatsApp.
- `components/store/` — tienda virtual: `CartContext` (localStorage), `StorePage` (filtros/búsqueda), `ProductModal`, `CartDrawer` (checkout WhatsApp), `CartFab`.
- `components/admin/` — panel: `AdminPanel` (login + tabs), `ProductManager`, `CategoryManager`, `OrdersManager`.
- `prisma/` — `schema.prisma` (Postgres/Supabase: AdminUser, Category, Product, ProductImage, Order, OrderItem), `migrations/`, `seed.mjs` + `seed-data.json`.
- `lib/` — `site.ts` (contacto + NAV_ITEMS), `db.ts` (Prisma singleton), `auth.ts` (HMAC sesión, bcrypt), `session.ts` (cookies → usuario), `server-dto.ts` (mapeo Prisma→DTO), `validators.ts` (zod), `store-types.ts` (tipos compartidos), `cloudinary-upload.ts` (upload server-side).
- `hooks/` — `useReveal.ts` drives the scroll-reveal animation system.

### Store data flow (important)

- `/tienda` is a server component with `export const dynamic = 'force-dynamic'` that reads Prisma directly and passes DTOs to the client.
- Products: `kind = "arma"` (brand/caliber/firearmType columns + `specsJson` for extra specs like Velocidad/Tanque) or `"producto"` (title/description/price/images).
- Prices are `Decimal` in Prisma; DTOs convert with `Number()` (`lib/server-dto.ts`).
- Orders get a sequential `number` assigned inside a transaction (computed as max+1, not a DB serial column); unique-conflict retries up to 3 times.
- The cart lives in the client (`localStorage`, key `tgc_cart_v1`). Checkout POSTs to `/api/orders` and opens WhatsApp with the order text via `waLink()` (`lib/site.ts`). If the POST fails (offline), WhatsApp still opens — the sale is never lost.
- Admin APIs validate with zod (`lib/validators.ts`) and require the session cookie; every write endpoint re-checks auth server-side.

### Auth (admin)

- Sessions: stateless HMAC-SHA256-signed cookie (`tgc_admin_session`, 7 days). Secret from `SESSION_SECRET` (required in production; dev fallback exists).
- Passwords: bcrypt via `bcryptjs` (pure JS).
- `POST /api/auth/login` sets the httpOnly cookie; `/admin` page checks `/api/auth/me` on mount; APIs call `requireAdmin()` from `lib/session.ts`.

### Images (Cloudinary)

Admin uploads go to Cloudinary folder `tienda` through `POST /api/admin/upload` (validates type/size: JPG/PNG/WEBP/GIF/AVIF, ≤10 MB). Product deletes best-effort clean the Cloudinary assets (`cloudinary.api.delete_resources`). `lib/cloudinary-upload.ts` has `uploadImageBuffer()`; `next.config.ts` allowlists `res.cloudinary.com`.

### Database (Supabase Postgres)

The store's data lives in **Supabase Postgres**, accessed exclusively through **Prisma** (`lib/db.ts`) — not through the Supabase JS client. `schema.prisma`'s datasource has two URLs: `url` (`DATABASE_URL`, pooled via PgBouncer, port 6543, `?pgbouncer=true` — used at runtime) and `directUrl` (`DIRECT_URL`, direct connection, port 5432 — used only by Prisma for migrations). Both point at the same Supabase project; keep them in sync between `.env` (Prisma CLI) and `.env.local` (Next.js).

### Legacy experiment (leave alone)

`lib/supabase/`, `middleware.ts` (root), `app/test-supabase/` are an unfinished experiment from a previous session using the **Supabase JS client** (auth/SSR) directly — a different, unused path from the Prisma-based store above. The root middleware wraps every request (harmless no-op). Don't extend it; the store uses Prisma + Postgres + custom HMAC auth instead.

### Language

UI copy, code comments, and many identifiers are in Spanish (`INTERESES`, `nombre`, `telefono`). Match this when editing user-facing strings.

### Scroll-reveal pattern

Elements get the CSS class `reveal` to animate in on scroll. `RevealObserver` (a client component that renders null) is placed at the top of each page to activate the `useReveal` hook, which sets up the IntersectionObserver. This pattern is used on every page.

### Styling

Pure CSS in `globals.css` using CSS custom properties. Design tokens are defined in `:root`: colors (`--green`, `--bg`, `--surface`, etc.), typography (`--ff-display` = Barlow Condensed, `--ff-body` = Barlow), and layout (`--maxw: 1240px`, `--nav-h: 76px`). No Tailwind, no CSS modules — styles are colocated in `globals.css` (store/admin styles are appended at the end of the file).

### Environment variables

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
DATABASE_URL=       # Postgres pooled (Supabase, port 6543, ?pgbouncer=true) — runtime
DIRECT_URL=          # Postgres direct (Supabase, port 5432) — Prisma migrations only
SESSION_SECRET=                   # firma de sesiones admin (obligatorio en producción)
ADMIN_EMAIL=                      # seed: admin inicial (default admin@topgunclub.bo)
ADMIN_PASSWORD=                   # seed: contraseña admin inicial (default TopgunClub2026!)
```

Keep these values in `.env.local`, which is gitignored and injected at container runtime. Never copy it into the Docker image. Get both connection strings from the Supabase dashboard: project → **Connect** → ORMs → Prisma.

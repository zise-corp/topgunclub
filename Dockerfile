FROM node:22-alpine AS base
RUN npm install --global npm@11.6.1

# ── Dependencias ──────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Asegurar permisos de ejecución
RUN chmod +x node_modules/.bin/next

# Generar el cliente Prisma antes del build
# Prisma solo necesita URLs sintácticamente válidas para generar el cliente.
# Las credenciales reales se inyectan al ejecutar el contenedor, nunca en la imagen.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    npx prisma generate

RUN npm run build

# ── Runner ────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: schema + migraciones + CLI (para `prisma migrate deploy` al arrancar)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/c12 ./node_modules/c12
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect ./node_modules/effect
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/empathic ./node_modules/empathic

USER nextjs

EXPOSE 3000

# Valida las variables, aplica migraciones pendientes y arranca el servidor.
CMD ["sh", "-c", "test -n \"$DATABASE_URL\" || { echo 'DATABASE_URL no configurada'; exit 1; }; test -n \"$DIRECT_URL\" || { echo 'DIRECT_URL no configurada'; exit 1; }; node node_modules/prisma/build/index.js migrate deploy && exec node server.js"]

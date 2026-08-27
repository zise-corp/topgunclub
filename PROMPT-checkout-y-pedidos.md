# Prompt — Checkout con entrega (retiro/envío) + panel de Pedidos

> Copiá todo lo que sigue y pegalo como prompt en el otro proyecto.
> Está escrito para que un agente lo implemente sin tener que adivinar nada.

---

## Contexto y alcance

Necesito implementar, en esta tienda virtual, **dos piezas** que ya funcionan en otro proyecto y quiero replicar con el mismo comportamiento:

1. **El formulario de datos del checkout** (lo que el cliente llena después de agregar productos al carrito), con dos modalidades de entrega y campos condicionales según el destino.
2. **La sección "Pedidos" del panel de administración**, donde el negocio ve y gestiona esos pedidos.

**Alcance:** llegar hasta que el pedido quede **registrado en la base de datos** y **visible en el panel**. El envío del mensaje por WhatsApp / notificación al negocio queda **fuera de este alcance** — no lo implementes todavía. Dejá el punto de integración claramente marcado con un `TODO`.

**Stack asumido:** Next.js (App Router) + TypeScript + Prisma + Postgres + Zod. Si este proyecto usa otro stack, adaptá los equivalentes pero **respetá el modelo de datos, las reglas de validación y el comportamiento** descritos abajo.

---

## 1. Modelo de datos

Agregá al modelo `Order` los campos de entrega. Los campos son **nullable** porque cada modalidad usa un subconjunto distinto.

```prisma
model Order {
  id        String      @id @default(cuid())
  number    Int         @unique // correlativo visible al cliente (#1, #2, …)
  customer  String?
  phone     String?
  note      String?

  // ── Entrega ──
  deliveryMethod  String  @default("pickup") // "pickup" | "delivery"
  region          String? // departamento destino — solo si delivery
  address         String? // dirección escrita — solo zona local
  locationLat     Float?  // ubicación exacta — solo zona local
  locationLng     Float?
  locationMapsUrl String? // link de Google Maps (generado o pegado) — solo zona local
  ci              String? // documento de identidad — solo fuera de la zona local
  email           String? // correo — solo fuera de la zona local

  status    String      @default("recibido") // recibido | en_proceso | completado | cancelado
  total     Decimal
  currency  String      @default("USD")
  items     OrderItem[]
  createdAt DateTime    @default(now())
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  name      String   // nombre congelado al momento de la compra
  price     Decimal  // precio congelado al momento de la compra
  qty       Int      @default(1)
}
```

**Decisiones importantes y por qué:**

- **`name` y `price` se copian en `OrderItem`**, no se leen del producto al mostrar el pedido. Si mañana cambia el precio o se borra el producto, el pedido histórico debe seguir mostrando lo que el cliente realmente compró.
- **`productId` es opcional y usa `onDelete: SetNull`**: borrar un producto del catálogo no puede borrar ni romper pedidos pasados.
- **`number` es un correlativo aparte del `id`**: el `id` es un cuid ilegible; el cliente y el negocio necesitan referirse al pedido como "#14".

---

## 2. Configuración de regiones y zona local

Creá un módulo compartido (cliente + servidor) — ej. `lib/delivery.ts`:

```ts
/** Regiones/departamentos a los que se envía. Ajustá a tu país. */
export const REGIONS = [
  'Cochabamba',
  'La Paz',
  'El Alto',
  'Santa Cruz',
  'Oruro',
  'Potosí',
  'Chuquisaca',
  'Tarija',
  'Beni',
  'Pando',
] as const;

export type Region = (typeof REGIONS)[number];

/**
 * La región donde está físicamente el negocio: es la única con reparto propio,
 * así que es la única donde se pide ubicación exacta en el mapa.
 */
export const LOCAL_REGION: Region = 'Cochabamba';

export function isLocalRegion(region: string | null | undefined): boolean {
  return region === LOCAL_REGION;
}

/** Centro del mapa al abrirlo (plaza principal de la región local). */
export const COCHABAMBA_CENTER = { lat: -17.3895, lng: -66.1568 };
```

> **Nota sobre "El Alto":** figura como opción separada aunque pertenece a La Paz, porque logísticamente se maneja aparte. Es una decisión de negocio, no técnica — la lista es solo un `string[]`, adaptala.

**Validación de links de Google Maps** (mismo módulo). Es una validación por *host*, no por regex sobre el texto, para no aceptar cualquier URL:

```ts
const MAPS_HOSTS = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl', // links cortos del botón "Compartir" de la app móvil
  'goo.gl',
];

export function isValidMapsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false; // no es una URL válida
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (!MAPS_HOSTS.includes(host)) return false;
  // google.com sirve mucho más que mapas: exigimos que la ruta sea de maps.
  if (host === 'google.com' || host === 'www.google.com') {
    return url.pathname.startsWith('/maps');
  }
  return true;
}

/** Convierte coordenadas en un link abrible por el repartidor. */
export function mapsUrlFromCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
```

> **Por qué se guarda también el link y no solo lat/lng:** el repartidor abre un link, no escribe coordenadas. Guardar el link armado hace que el panel de admin muestre un enlace clickeable sin lógica extra.

---

## 3. El formulario de checkout — comportamiento exacto

El formulario vive dentro del panel/drawer del carrito, **debajo del listado de productos y del subtotal**.

### 3.1 Campos siempre visibles

| Campo | Obligatorio | Validación |
|---|---|---|
| Nombre | Sí | mínimo 2 caracteres |
| Teléfono / WhatsApp | Sí | mínimo 6 dígitos, ignorando espacios y símbolos: `phone.replace(/\D/g, '').length >= 6` |
| Nota | **No** | máximo 1000 caracteres |

### 3.2 Selector de modalidad de entrega

Dos botones tipo *toggle*, **retiro seleccionado por defecto**:

- **Retiro en el local** (`pickup`)
- **Envío a domicilio** (`delivery`)

Implementalos como `role="radiogroup"` con dos `role="radio"` y `aria-checked`, no como dos botones sueltos — es un control de selección única y debe anunciarse como tal a lectores de pantalla.

```tsx
<div className="deliv-switch" role="radiogroup" aria-label="Método de entrega">
  <button
    type="button"
    role="radio"
    aria-checked={!isDelivery}
    className={'deliv-switch__opt' + (!isDelivery ? ' active' : '')}
    onClick={() => setDeliveryMethod('pickup')}
  >
    Retiro en el local
  </button>
  <button
    type="button"
    role="radio"
    aria-checked={isDelivery}
    className={'deliv-switch__opt' + (isDelivery ? ' active' : '')}
    onClick={() => setDeliveryMethod('delivery')}
  >
    Envío a domicilio
  </button>
</div>
```

### 3.3 Ramificación del formulario

```
┌─ Retiro en el local ──────────────────────────────────────┐
│  No pide nada más. Nombre + teléfono ya alcanzan.         │
└───────────────────────────────────────────────────────────┘

┌─ Envío a domicilio ───────────────────────────────────────┐
│  Aparece: <select> de Departamento (obligatorio)          │
│                                                            │
│  ├─ Si es la REGIÓN LOCAL (Cochabamba):                   │
│  │    • Dirección escrita  (obligatoria, mín. 5 caract.)  │
│  │    • Ubicación exacta   (obligatoria — ver §4)         │
│  │                                                         │
│  └─ Si es CUALQUIER OTRO departamento:                    │
│       • CI / documento    (obligatorio, mín. 4 caract.)   │
│       • Correo electrónico (obligatorio, formato válido)  │
│       + texto de ayuda: el transporte se coordina aparte  │
└───────────────────────────────────────────────────────────┘
```

**La razón del diseño:** en la ciudad del negocio hay reparto propio, así que hace falta saber *exactamente* a dónde ir (dirección escrita **y** punto en el mapa). Fuera de esa ciudad se despacha por empresa de transporte, que exige **documento de identidad** del destinatario para retirar el paquete, y el **correo** para mandar la guía de envío. Por eso los campos son distintos, no es un capricho.

Estado en React:

```tsx
const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
const [region, setRegion]   = useState('');
const [address, setAddress] = useState('');
const [location, setLocation] = useState<LocationValue>({ lat: null, lng: null, mapsUrl: '' });
const [ci, setCi]       = useState('');
const [email, setEmail] = useState('');

const isDelivery = deliveryMethod === 'delivery';
const isLocal    = isDelivery && isLocalRegion(region);
```

### 3.4 Validación en el cliente

Una sola función que devuelve **el primer error o `null`**. Devolver un único mensaje (y no una lista) mantiene la UI simple: se muestra un solo aviso arriba del botón.

```ts
const validate = (): string | null => {
  if (customer.trim().length < 2) return 'Ingresá tu nombre para enviar el pedido';
  if (phone.trim().replace(/\D/g, '').length < 6) return 'Ingresá un teléfono válido';
  if (!isDelivery) return null;

  if (!region) return 'Elegí el departamento de entrega';

  if (isLocal) {
    if (address.trim().length < 5) return 'Escribí tu dirección de entrega';
    const hasCoords = location.lat != null && location.lng != null;
    const hasUrl = !!location.mapsUrl.trim() && isValidMapsUrl(location.mapsUrl);
    if (!hasCoords && !hasUrl) {
      return 'Compartí tu ubicación en el mapa o pegá un link de Google Maps válido';
    }
    return null;
  }

  if (ci.trim().length < 4) return 'Ingresá tu número de CI';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingresá un correo válido';
  return null;
};
```

### 3.5 Modal de confirmación (dos pasos)

El botón principal **no envía directamente**. Hace esto:

1. **Primer clic** → corre `validate()`. Si hay error, lo muestra y corta. Si está OK, abre un modal de confirmación.
2. **En el modal** se muestra un resumen mínimo: cantidad de ítems, total, y modalidad de entrega (con el departamento si aplica). Dos acciones: **Volver** y **Sí, confirmar**.
3. **Solo al confirmar** se registra el pedido.

```tsx
{confirming && (
  <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmar pedido">
    <button className="confirm-modal__backdrop" onClick={() => setConfirming(false)} aria-label="Cancelar" />
    <div className="confirm-modal__panel">
      <h4>¿Confirmás tu pedido?</h4>
      <p>
        {count} ítem{count !== 1 ? 's' : ''} · <b>{formatPrice(total)}</b><br />
        {isDelivery ? `Envío a domicilio — ${region}` : 'Retiro en el local'}
      </p>
      <div className="confirm-modal__actions">
        <button className="btn btn--ghost" onClick={() => setConfirming(false)}>Volver</button>
        <button className="btn btn--primary" onClick={handleSend}>Sí, confirmar</button>
      </div>
    </div>
  </div>
)}
```

---

## 4. El mapa de ubicación — implementación detallada

### 4.1 Qué se usa y por qué

- **Librería:** [Leaflet](https://leafletjs.com/) `^1.9.4` + `@types/leaflet` `^1.9.22`.
- **Tiles (imágenes del mapa):** **OpenStreetMap** — `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- **Costo:** **cero**. No requiere cuenta, ni API key, ni tarjeta de crédito.

> **Por qué no Google Maps:** el mapa embebido de Google exige una API key con facturación habilitada en Google Cloud. Leaflet + OpenStreetMap da un mapa interactivo con pin arrastrable sin ninguna de esas dependencias. Nótese que **el link que se guarda sí es de Google Maps** (`google.com/maps?q=lat,lng`) — es solo una URL, no requiere API. Así el repartidor lo abre en la app que ya tiene.

Instalación:

```bash
npm install leaflet
npm install -D @types/leaflet
```

### 4.2 Tres formas de fijar la ubicación

El componente ofrece tres caminos, y **el último que se usa gana** (son mutuamente excluyentes):

1. **Botón "Usar mi ubicación actual"** → `navigator.geolocation.getCurrentPosition`.
2. **Tocar el mapa o arrastrar el pin** → coordenadas del punto elegido.
3. **Pegar un link de Google Maps** → se valida el host y se guarda tal cual.

Además, **las coordenadas se muestran en dos campos de texto editables** (Latitud / Longitud) que se llenan solos al usar el mapa o el GPS. Sirven para ajuste fino y para que el usuario vea que algo pasó.

Reglas de exclusión mutua:
- Usar mapa / GPS / escribir coordenadas → **limpia** el campo del link.
- Pegar un link válido → **limpia** las coordenadas.

### 4.3 Trampas conocidas (implementalas así o se rompe)

Estas cuatro cosas costaron depuración; están documentadas para que no las repitas:

**a) El ícono por defecto de Leaflet se rompe en Next.js.** Leaflet resuelve la imagen del marcador por una ruta CSS relativa al bundle, que Next reescribe. Solución: usar un `divIcon` con SVG inline.

```ts
const PIN_ICON = L.divIcon({
  className: '',
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27C30 6.7 23.3 0 15 0z" fill="#C99E66"/>
    <circle cx="15" cy="15" r="6" fill="#0A0A0A"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42], // la punta del pin, no su centro
});
```

**b) El mapa se debe montar UNA sola vez.** Si el `useEffect` que crea el mapa lleva `value.lat` / `value.lng` en sus dependencias, su función de limpieza destruye y recrea el mapa entero en **cada movimiento del pin** — se pierde el zoom y parpadea. Montalo con dependencias vacías (o solo la callback estable) y actualizá el marcador de forma imperativa con `marker.setLatLng(...)`.

**c) El mapa calcula mal su tamaño si el contenedor se anima al abrir.** Como el drawer del carrito entra con una transición, hay que llamar `map.invalidateSize()` un instante después de montar:

```ts
const t = setTimeout(() => map.invalidateSize(), 250);
```

**d) Desactivá el zoom con la rueda del mouse.** El formulario vive dentro de un panel scrolleable; sin esto, la rueda hace zoom en el mapa en vez de scrollear el formulario, y el usuario queda atrapado. Los botones `+`/`−` y el pinch en móvil siguen funcionando.

```ts
L.map(el, { attributionControl: false, scrollWheelZoom: false })
```

### 4.4 Geolocalización: mensajes de error diferenciados

No sirve un "no pudimos obtener tu ubicación" genérico, porque la salida es distinta según la causa. Diferenciá por `err.code`:

```ts
navigator.geolocation.getCurrentPosition(
  (pos) => { /* setPoint(pos.coords.latitude, pos.coords.longitude) */ },
  (err) => {
    const msg =
      err.code === err.PERMISSION_DENIED
        ? 'No diste permiso de ubicación. Podés marcar el punto tocando el mapa, o pegar un link de Google Maps.'
        : err.code === err.TIMEOUT
          ? 'Tardó demasiado en responder. Probá de nuevo o marcá el punto en el mapa.'
          : 'No pudimos obtener tu ubicación (sin señal de GPS). Marcá el punto tocando el mapa.';
    setGeoError(msg);
  },
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
);
```

**Importante:** el mensaje de error debe **limpiarse** en cuanto el usuario fija la ubicación por cualquier otra vía. Si no, queda un error rojo contradiciendo un "✓ ubicación marcada" al mismo tiempo.

**Requisito de plataforma:** la API de geolocalización solo funciona en **HTTPS** (o `localhost`). En producción no es problema, pero tenelo en cuenta si probás desde una IP de red local.

### 4.5 Campos de coordenadas editables

Mantené el **texto** de los inputs en un estado separado del valor numérico. Si sincronizás el input directamente contra el número, al escribir `-17.` (todavía inválido) el campo se resetea y es imposible tipear.

```tsx
const [coordText, setCoordText] = useState({ lat: '', lng: '' });
```

Al escribir: actualizá el texto siempre; parseá y propagá el valor **solo si ambos** son números válidos y están en rango (`lat` −90..90, `lng` −180..180). Si son válidos, movés el pin y centrás el mapa.

---

## 5. Registro del pedido en el servidor

### 5.1 Validación con Zod (espejo de la del cliente)

La validación del cliente es para la experiencia; **esta es la que protege los datos**. Nunca confíes solo en la del navegador. Usá `superRefine` para las reglas condicionales:

```ts
export const orderInputSchema = z
  .object({
    customer: z.string().trim().max(120).optional().default(''),
    phone: z.string().trim().max(40).optional().default(''),
    note: z.string().trim().max(1000).optional().default(''),
    deliveryMethod: z.enum(['pickup', 'delivery']).default('pickup'),
    region: z.enum(REGIONS).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    locationLat: z.coerce.number().min(-90).max(90).nullable().optional(),
    locationLng: z.coerce.number().min(-180).max(180).nullable().optional(),
    locationMapsUrl: z.string().trim().max(2000).nullable().optional(),
    ci: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().email('Correo inválido').max(200).nullable().optional(),
    items: z.array(orderItemSchema).min(1, 'El carrito está vacío').max(100),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod !== 'delivery') return;

    if (!data.region) {
      ctx.addIssue({ code: 'custom', path: ['region'], message: 'Elegí tu departamento' });
      return;
    }

    if (isLocalRegion(data.region)) {
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: 'Ingresá tu dirección' });
      }
      const hasCoords  = data.locationLat != null && data.locationLng != null;
      const hasMapsUrl = !!data.locationMapsUrl && isValidMapsUrl(data.locationMapsUrl);
      if (!hasCoords && !hasMapsUrl) {
        ctx.addIssue({
          code: 'custom',
          path: ['locationMapsUrl'],
          message: 'Compartí tu ubicación o pegá un link de Google Maps válido',
        });
      }
      return;
    }

    if (!data.ci)    ctx.addIssue({ code: 'custom', path: ['ci'],    message: 'Ingresá tu CI' });
    if (!data.email) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Ingresá tu correo' });
  });
```

### 5.2 Endpoint `POST /api/orders` (público)

Es público porque lo llama un cliente sin cuenta. Tres reglas de seguridad no negociables:

**a) Re-verificá los precios contra la base de datos.** El carrito vive en el navegador; un usuario puede alterar el precio antes de enviar. Si el `productId` existe, usá **siempre** el precio y el nombre de la base, ignorando lo que vino en el request:

```ts
const items = data.items.map((it) => {
  const dbProduct = it.productId ? productMap.get(it.productId) : undefined;
  return {
    productId: dbProduct ? dbProduct.id : (it.productId ?? null),
    name:      dbProduct ? dbProduct.name : it.name,
    price:     dbProduct ? dbProduct.price : it.price,   // ← el precio manda la DB
    qty: Math.min(99, Math.max(1, Math.round(it.qty))),  // ← cantidad acotada
  };
});

const total = items.reduce((acc, it) => acc + Number(it.price) * it.qty, 0);
```

**b) Calculá el total en el servidor**, nunca aceptes un `total` enviado por el cliente.

**c) Guardá solo los campos de la modalidad elegida.** Si alguien llena el formulario de envío, se arrepiente y elige retiro, no deben quedar datos huérfanos del flujo descartado:

```ts
const isDelivery = data.deliveryMethod === 'delivery';
const local = isDelivery && isLocalRegion(data.region);

// …dentro del create:
region:          isDelivery ? data.region ?? null : null,
address:         local ? data.address || null : null,
locationLat:     local ? data.locationLat ?? null : null,
locationLng:     local ? data.locationLng ?? null : null,
locationMapsUrl: local ? data.locationMapsUrl || null : null,
ci:              isDelivery && !local ? data.ci || null : null,
email:           isDelivery && !local ? data.email || null : null,
```

### 5.3 Número correlativo sin condición de carrera

El `number` visible (#1, #2, …) **no** es la clave primaria. Se calcula como `max + 1` **dentro de una transacción**, y como dos pedidos simultáneos pueden colisionar, hay que reintentar ante conflicto de unicidad:

```ts
let order = null;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    order = await prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;
      return tx.order.create({ data: { number, /* …resto… */ }, include: { items: true } });
    });
    break;
  } catch (err) {
    const isConflict = err instanceof Error && String(err.message).includes('Unique constraint failed');
    if (!isConflict || attempt === 2) throw err;
  }
}
```

> Si tu base soporta una secuencia nativa (`SERIAL`/`IDENTITY`) para este campo, usala y ahorrate el reintento. Este patrón existe porque el campo no es la PK.

Respuesta: `201` con `{ order }` serializado.

### 5.4 Punto de integración pendiente

Después de crear el pedido, dejá marcado:

```ts
// TODO: notificar al negocio (WhatsApp / email / webhook).
// Fuera del alcance de esta implementación.
```

---

## 6. Serialización a DTO

No devuelvas objetos de Prisma directamente al cliente: los `Decimal` no son JSON-serializables y los `DateTime` deben ir en ISO.

```ts
export function toOrderDTO(o: OrderWithItems): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    customer: o.customer,
    phone: o.phone,
    note: o.note,
    deliveryMethod: o.deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
    region: o.region,
    address: o.address,
    locationLat: o.locationLat,
    locationLng: o.locationLng,
    locationMapsUrl: o.locationMapsUrl,
    ci: o.ci,
    email: o.email,
    status: o.status,
    total: Number(o.total),          // Decimal → number
    currency: o.currency,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price),
      qty: it.qty,
    })),
    createdAt: o.createdAt.toISOString(),  // Date → ISO string
  };
}
```

---

## 7. Panel de administración — sección "Pedidos"

### 7.1 Endpoints (ambos exigen sesión de administrador)

- **`GET /api/admin/orders`** → lista completa, `orderBy: { createdAt: 'desc' }`, con `include: { items: true }`.
- **`PATCH /api/admin/orders/[id]`** → cambia el estado. Body `{ status }`, validado con `z.enum(['recibido','en_proceso','completado','cancelado'])`. Verificá que el pedido exista (404 si no) y **re-chequeá la sesión dentro del handler** — no dependas solo del middleware.

### 7.2 Estados

Definilos en un módulo compartido para que la vista y el resumen usen los mismos rótulos:

```ts
export const STATUS_LABELS: Record<string, string> = {
  recibido:   'Recibido',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado:  'Cancelado',
};

export const STATUS_ORDER = ['recibido', 'en_proceso', 'completado', 'cancelado'] as const;
```

Cada estado con su color semántico (recibido = ámbar/pendiente, en proceso = azul, completado = verde, cancelado = rojo apagado).

### 7.3 Controles de la vista

- **Buscador** que filtra por: número de pedido, nombre del cliente, teléfono, región, **y nombre de cualquier producto del pedido**. Ese último es el que más se usa en la práctica ("¿quién pidió el rifle X?").
- **Chips de filtro por estado**, cada uno con su conteo, más un "Todos".

```ts
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  return orders.filter((o) => {
    if (filter !== 'todos' && o.status !== filter) return false;
    if (!q) return true;
    return (
      String(o.number).includes(q) ||
      (o.customer ?? '').toLowerCase().includes(q) ||
      (o.phone ?? '').toLowerCase().includes(q) ||
      (o.region ?? '').toLowerCase().includes(q) ||
      o.items.some((it) => it.name.toLowerCase().includes(q))
    );
  });
}, [orders, filter, query]);
```

### 7.4 Anatomía de la tarjeta de pedido

Cada pedido es una tarjeta con **cuatro bloques en este orden**, pensada para que quien despacha encuentre lo que necesita sin leer todo:

1. **Cabecera** — el número en un recuadro destacado (ancla visual para escanear la lista), nombre del cliente, fecha y hora, y a la derecha un `<select>` para cambiar el estado.

2. **Ítems** — una línea por producto: `Nombre ×cantidad` a la izquierda, subtotal a la derecha.

3. **Bloque de entrega** — lo que hace falta para despachar. Cambia según la modalidad:
   - **Retiro:** una línea, "Retiro en el local".
   - **Envío:** título "Envío a domicilio · {región}" y una lista de definición (`<dl>`) con lo que corresponda: **Dirección**, **CI**, **Correo**, y **Ubicación** como enlace *"Abrir en el mapa →"* con `target="_blank" rel="noopener noreferrer"`.

4. **Pie** — teléfono del cliente como enlace directo de contacto, y el **total** destacado.

Si hay nota del cliente, va entre el bloque de entrega y el pie, visualmente diferenciada (itálica, con una barra lateral).

### 7.5 Cambio de estado optimista

Actualizá la UI **antes** de que responda el servidor, y **revertí** si falla. Cambiar el estado es la acción más repetida del panel; esperar la red en cada clic lo hace sentir lento.

```ts
const changeStatus = async (order: OrderDTO, status: string) => {
  setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));  // optimista
  try {
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));  // revertir
      setError('No se pudo actualizar el estado');
    }
  } catch {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));    // revertir
    setError('Error de red al actualizar');
  }
};
```

### 7.6 Estados de carga y vacío

- **Cargando:** *skeletons* con la forma de las tarjetas, no un texto "Cargando…".
- **Sin pedidos:** ícono + "Todavía no hay pedidos. Aparecerán acá cuando alguien compre en la tienda."
- **Sin resultados de búsqueda:** mensaje distinto al anterior + botón "Limpiar filtros". Son dos situaciones diferentes y confundirlas frustra.

---

## 8. Detalles de UX que no son opcionales

Estos salieron de errores reales; si los omitís, reaparecen:

1. **El panel del carrito debe scrollear como una sola unidad.** Con el mapa desplegado el formulario supera la altura de pantalla. Si solo scrollea la lista de productos, **el botón de confirmar queda fuera de la pantalla e inalcanzable**. Poné `overflow-y: auto` en el contenedor completo, con la cabecera `position: sticky`.

2. **Bloqueá el scroll del fondo** mientras el carrito está abierto (`overflow: hidden` en `body`), y compensá el ancho de la barra de scroll con `padding-right` para que el contenido no salte. Si hay más de un panel que bloquea (menú móvil, por ejemplo), usá un **contador compartido**: cerrar uno no debe liberar el scroll si el otro sigue abierto.

3. **Nunca animes la opacidad desde 0 en contenido esencial.** Si la animación no llega a ejecutarse (pestaña en segundo plano, animaciones reducidas), el contenido queda invisible para siempre. Animá solo el desplazamiento: el peor caso es un elemento unos píxeles corrido, nunca una pantalla en blanco.

4. **Si el sitio es de tema oscuro, declará `color-scheme: dark` en `:root`.** Sin eso, el desplegable nativo de los `<select>` lo dibuja el sistema en blanco y rompe el diseño.

5. **Limpiá el formulario después de registrar el pedido** (todos los campos, incluidos región, dirección, ubicación, CI y correo) para que el siguiente pedido no arrastre datos del anterior.

---

## 9. Cómo verificar que quedó bien

Probá estos casos y confirmá el resultado:

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Retiro, solo nombre y teléfono | Se registra. En la base: `deliveryMethod='pickup'` y `region`, `address`, `lat/lng`, `ci`, `email` **todos en null** |
| 2 | Envío + región local, sin marcar ubicación | Bloquea con "Compartí tu ubicación…" |
| 3 | Envío + región local, dirección de menos de 5 caracteres | Bloquea con "Escribí tu dirección de entrega" |
| 4 | Envío + región local, con pin en el mapa | Se guardan `locationLat`, `locationLng` y `locationMapsUrl` con el link armado |
| 5 | Envío + región local, con link de Google Maps pegado | Se guarda `locationMapsUrl`; `lat`/`lng` quedan en null |
| 6 | Pegar un link que **no** sea de Google Maps | Se rechaza con mensaje de link inválido |
| 7 | Marcar el mapa y **después** pegar un link | Las coordenadas se limpian: gana el link |
| 8 | Pegar un link y **después** marcar el mapa | El link se limpia: ganan las coordenadas |
| 9 | Envío + otro departamento, sin CI o correo | Bloquea con el mensaje correspondiente |
| 10 | Envío + otro departamento, correo mal formado | Bloquea con "Ingresá un correo válido" |
| 11 | Alterar el precio en el request (DevTools) | El pedido se guarda con el **precio de la base**, no el enviado |
| 12 | Dos pedidos casi simultáneos | Reciben números correlativos distintos, sin error |
| 13 | Panel: cambiar estado | Cambia al instante; si el servidor falla, vuelve al valor anterior y muestra el error |
| 14 | Panel: buscar por nombre de producto | Aparecen los pedidos que contienen ese producto |
| 15 | Móvil, envío local con el mapa abierto | El botón de confirmar es alcanzable scrolleando el panel |

---

## 10. Resumen del flujo completo

```
Cliente agrega productos al carrito (estado en localStorage)
        │
        ▼
Abre el carrito → ve ítems, cantidades y subtotal
        │
        ▼
Llena nombre + teléfono  (siempre obligatorios)
        │
        ▼
Elige modalidad ──┬── Retiro en el local ──────────────► nada más que pedir
                  │
                  └── Envío a domicilio
                          │
                          ▼
                   Elige departamento
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
     REGIÓN LOCAL                 OTRO DEPARTAMENTO
     • Dirección escrita          • CI / documento
     • Ubicación exacta:          • Correo electrónico
       GPS / pin en mapa /          (el transporte se
       link de Google Maps           coordina aparte)
              │                        │
              └───────────┬────────────┘
                          ▼
              Clic en "Confirmar pedido"
                          │
                          ▼
              validate() → ¿error? → se muestra y corta
                          │ OK
                          ▼
              Modal "¿Confirmás tu pedido?"
                          │ confirma
                          ▼
              POST /api/orders
                • Zod valida (incl. reglas condicionales)
                • Precios re-verificados contra la DB
                • Total calculado en el servidor
                • Número correlativo en transacción
                • Solo se guardan los campos de la modalidad elegida
                          │
                          ▼
              Pedido en la base  →  visible en /admin › Pedidos
                          │
                          ▼
              [TODO: notificación al negocio — fuera de alcance]
```

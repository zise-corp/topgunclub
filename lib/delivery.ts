// ─────────────────────────────────────────────────────────────────────────────
// Entrega: regiones de Bolivia y helpers compartidos (cliente + servidor)
// ─────────────────────────────────────────────────────────────────────────────

/** 9 departamentos + El Alto (se maneja aparte por volumen de pedidos). */
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

/** Cochabamba es la única con envío local: se pide ubicación exacta. */
export const LOCAL_REGION: Region = 'Cochabamba';

export function isLocalRegion(region: string | null | undefined): boolean {
  return region === LOCAL_REGION;
}

const MAPS_HOSTS = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
];

/** Acepta solo links de Google Maps (incluye los cortos de compartir). */
export function isValidMapsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
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

export function mapsUrlFromCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Coordenadas del centro de Cochabamba — punto inicial del mapa. */
export const COCHABAMBA_CENTER = { lat: -17.3895, lng: -66.1568 };

import type { MetadataRoute } from 'next';

const BASE = 'https://topgunclub.com.bo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Fecha real de esta actualización. Evita indicar falsamente a Google que
  // todas las páginas cambiaron cada vez que solicita el sitemap.
  const lastModified = new Date('2026-08-20');
  return [
    { url: `${BASE}/`,         lastModified, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/cursos`,   lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/tienda`,  lastModified, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/eventos`,  lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/galeria`,  lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contacto`, lastModified, changeFrequency: 'yearly',  priority: 0.8 },
  ];
}

import type { MetadataRoute } from 'next';

const BASE = 'https://topgunclub.com.bo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`,         lastModified, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/cursos`,   lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/tienda`,  lastModified, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/eventos`,  lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/galeria`,  lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contacto`, lastModified, changeFrequency: 'yearly',  priority: 0.8 },
  ];
}

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/pedido', '/test-supabase'],
    },
    sitemap: 'https://topgunclub.com.bo/sitemap.xml',
  };
}

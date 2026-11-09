import type { MetadataRoute } from 'next';
import { all } from '@/lib/db';
import { categories } from '@/lib/store';
import { siteUrl } from '@/lib/config';

// Built on request, so products added in the admin panel appear straight away.
export const dynamic = 'force-dynamic';

/** Needs SITE_URL (e.g. https://www.yourshop.co.uk), since search engines require absolute links. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()?.origin ?? 'http://localhost:3000';
  const fixed = ['', '/shop', '/repairs', '/blog', '/about', '/contact', '/delivery', '/returns', '/terms', '/privacy', '/faqs'];
  const products = all<{ slug: string; updated_at: string }>('SELECT slug, updated_at FROM products WHERE is_active = 1');
  const posts = all<{ slug: string; updated_at: string }>('SELECT slug, updated_at FROM blog_posts WHERE is_active = 1');
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(`${p.updated_at.replace(' ', 'T')}Z`) })),
    ...categories().map((c) => ({ url: `${base}/shop?category=${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: new Date(`${p.updated_at.replace(' ', 'T')}Z`) })),
  ];
}

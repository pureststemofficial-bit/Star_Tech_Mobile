import { all, run } from './db.ts';
import { siteUrl } from './config.ts';
import { categories, localizedSettings } from './store.ts';
import { analyzeProductSeo, productDraftFor, productPeers, type ProductSeoFields } from './product-seo.ts';
import type { SeoLang, SeoReport, SeoSetup } from './seo.ts';
import type { Product } from './types.ts';

/* Product SEO for the admin panel: scores for Admin -> Products, setup for the editor, score history. */

const COLUMNS = `p.id, p.slug, p.name, p.name_pt, p.short_desc, p.short_desc_pt, p.description, p.description_pt, p.features, p.features_pt,
  p.specs, p.specs_pt, p.brand, p.focus_keyword, p.focus_keyword_pt, p.related_keywords, p.related_keywords_pt,
  p.seo_title, p.seo_title_pt, p.seo_description, p.seo_description_pt, p.image_alt, p.image_alt_pt, p.category_id`;

export type ProductSeoRow = ProductSeoFields & { id: number; slug: string; category_id: number | null };
export type ProductSeoListRow = ProductSeoRow & Pick<Product, 'price_pence' | 'stock' | 'is_active' | 'is_featured' | 'is_popular' | 'is_new_arrival' | 'updated_at'>
  & { image_count: number; thumb: string | null; category: string | null };

const siteNames = () => ({ en: localizedSettings('en').site_name, pt: localizedSettings('pt').site_name });

/** Category names by id, in both languages (Portuguese falls back to English). */
export function categoryNames(): Record<string, Record<SeoLang, string>> {
  return Object.fromEntries(categories().map((c) => [String(c.id), { en: c.name, pt: c.name_pt?.trim() || c.name }]));
}

function score(row: ProductSeoRow & { image_count: number }, ctx: { names: Record<SeoLang, string>; cats: ReturnType<typeof categoryNames>; peers: Record<SeoLang, ReturnType<typeof productPeers>> }, lang: SeoLang): SeoReport | null {
  const category = row.category_id ? ctx.cats[String(row.category_id)] ?? { en: '', pt: '' } : { en: '', pt: '' };
  const draft = productDraftFor(row, lang, { category, images: row.image_count });
  return draft
    ? analyzeProductSeo(draft, { lang, slug: row.slug, siteName: ctx.names[lang], peers: ctx.peers[lang], checkSlug: lang === 'en', selfId: row.id })
    : null;
}

const scoringContext = (rows: ProductSeoRow[]) => ({
  names: siteNames(),
  cats: categoryNames(),
  peers: { en: productPeers(rows, 'en'), pt: productPeers(rows, 'pt') },
});

/** Every product scored in both languages, with its first recorded score, for Admin -> Products. */
export function productSeoOverview() {
  const rows = all<ProductSeoListRow>(`SELECT ${COLUMNS}, p.price_pence, p.stock, p.is_active, p.is_featured, p.is_popular, p.is_new_arrival, p.updated_at,
      c.name AS category,
      (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) AS image_count,
      (SELECT thumb FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order, id LIMIT 1) AS thumb
    FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC`);
  const ctx = scoringContext(rows);
  const first = new Map(all<{ product_id: number; score: number }>(
    `SELECT product_id, score FROM product_seo_history h WHERE lang = 'en' AND day = (SELECT MIN(day) FROM product_seo_history WHERE product_id = h.product_id AND lang = 'en')`,
  ).map((r) => [r.product_id, r.score]));
  return rows.map((row) => ({ row, en: score(row, ctx, 'en')!, pt: score(row, ctx, 'pt'), firstScore: first.get(row.id) }));
}

const allRows = () => all<ProductSeoRow>(`SELECT ${COLUMNS} FROM products p`);

/** Saves today's score for both languages (called after every save of the product). */
export function recordProductSeoScores(productId: number) {
  const rows = allRows();
  const row = rows.find((r) => r.id === productId);
  if (!row) return;
  const imageCount = all<{ n: number }>('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?', productId)[0]?.n ?? 0;
  const ctx = scoringContext(rows);
  for (const lang of ['en', 'pt'] as const) {
    const report = score({ ...row, image_count: imageCount }, ctx, lang);
    if (report) {
      run(`INSERT INTO product_seo_history (product_id, lang, day, score) VALUES (?, ?, date('now'), ?)
           ON CONFLICT (product_id, lang, day) DO UPDATE SET score = excluded.score`, productId, lang, report.score);
    } else {
      run(`DELETE FROM product_seo_history WHERE product_id = ? AND lang = ? AND day = date('now')`, productId, lang);
    }
  }
}

/** The last 30 recorded scores of a product, oldest first. */
export function productSeoHistory(productId: number): SeoSetup['history'] {
  const out: SeoSetup['history'] = { en: [], pt: [] };
  const rows = all<{ lang: SeoLang; day: string; score: number }>(
    'SELECT lang, day, score FROM (SELECT lang, day, score FROM product_seo_history WHERE product_id = ? ORDER BY day DESC LIMIT 60) ORDER BY day', productId);
  for (const r of rows) out[r.lang].push({ day: r.day, score: r.score });
  for (const l of ['en', 'pt'] as const) out[l] = out[l].slice(-30);
  return out;
}

/** Everything the product editor's live SEO panel needs besides the product itself. */
export function productSeoSetup(selfId?: number): SeoSetup {
  const rows = allRows();
  return {
    siteName: siteNames(),
    host: siteUrl()?.host ?? 'localhost:3000',
    peers: { en: productPeers(rows, 'en').filter((p) => p.id !== selfId), pt: productPeers(rows, 'pt').filter((p) => p.id !== selfId) },
    history: selfId ? productSeoHistory(selfId) : { en: [], pt: [] },
    categories: categoryNames(),
  };
}

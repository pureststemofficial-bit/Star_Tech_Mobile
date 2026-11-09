import { get, all, type Param } from './db.ts';
import type { CardProduct, Product } from './types.ts';

export const CARD_COLUMNS = `
  p.id, p.name, p.name_pt, p.slug, p.brand, p.price_pence, p.compare_pence, p.stock, p.category_id,
  (SELECT i.thumb FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS thumb,
  (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = 1) AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = 1) AS review_count`;

export const PRICE_RANGES = [
  { id: '0-50', label: '€0 - €50', min: 0, max: 5000 },
  { id: '50-100', label: '€50 - €100', min: 5000, max: 10000 },
  { id: '100-200', label: '€100 - €200', min: 10000, max: 20000 },
  { id: '200-500', label: '€200 - €500', min: 20000, max: 50000 },
  { id: '500+', label: '€500+', min: 50000, max: null },
] as const;

export const SORTS = {
  popular: 'p.is_featured DESC, p.sold_count DESC, p.id DESC',
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_pence ASC',
  price_desc: 'p.price_pence DESC',
  rating: 'rating DESC NULLS LAST, review_count DESC',
} as const;
export type SortKey = keyof typeof SORTS;
export const SORT_KEYS = Object.keys(SORTS) as SortKey[];

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);

export interface SearchInput {
  q?: string;
  categoryIds?: number[];
  brands?: string[];
  prices?: string[];
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

/**
 * Filtered, paginated product listing. All user input goes through placeholders; the only
 * interpolated SQL fragments come from fixed whitelists (SORTS, PRICE_RANGES).
 */
export function search({ q = '', categoryIds = [], brands = [], prices = [], sort = 'popular', page = 1, perPage = 12 }: SearchInput) {
  const where = ['p.is_active = 1'];
  const params: Param[] = [];

  if (q) {
    where.push(`(p.name LIKE ? ESCAPE '\\' OR p.name_pt LIKE ? ESCAPE '\\' OR p.brand LIKE ? ESCAPE '\\' OR p.short_desc LIKE ? ESCAPE '\\' OR p.short_desc_pt LIKE ? ESCAPE '\\')`);
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like, like, like);
  }
  if (categoryIds.length) {
    where.push(`p.category_id IN (${categoryIds.map(() => '?').join(',')})`);
    params.push(...categoryIds);
  }
  if (brands.length) {
    where.push(`p.brand IN (${brands.map(() => '?').join(',')})`);
    params.push(...brands);
  }
  const ranges = PRICE_RANGES.filter((r) => prices.includes(r.id));
  if (ranges.length) {
    where.push('(' + ranges.map((r) => (r.max === null ? 'p.price_pence >= ?' : '(p.price_pence >= ? AND p.price_pence < ?)')).join(' OR ') + ')');
    for (const r of ranges) {
      if (r.max === null) params.push(r.min);
      else params.push(r.min, r.max);
    }
  }

  const whereSql = where.join(' AND ');
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM products p WHERE ${whereSql}`, ...params)?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const items = all<CardProduct>(
    `SELECT ${CARD_COLUMNS} FROM products p WHERE ${whereSql} ORDER BY ${SORTS[sort] || SORTS.popular} LIMIT ? OFFSET ?`,
    ...params, perPage, (current - 1) * perPage,
  );
  return { items, total, page: current, pages, perPage };
}

export const featured = (limit = 10) =>
  all<CardProduct>(`SELECT ${CARD_COLUMNS} FROM products p WHERE p.is_active = 1
       ORDER BY p.is_featured DESC, p.sold_count DESC, p.id DESC LIMIT ?`, limit);

export const related = (product: Pick<Product, 'id' | 'category_id' | 'brand'>, limit = 4) =>
  all<CardProduct>(`SELECT ${CARD_COLUMNS} FROM products p
       WHERE p.is_active = 1 AND p.id != ? AND (p.category_id IS ? OR p.brand = ?)
       ORDER BY p.is_featured DESC, p.sold_count DESC LIMIT ?`, product.id, product.category_id, product.brand, limit);

export const byIds = (ids: number[]) =>
  ids.length
    ? all<CardProduct>(`SELECT ${CARD_COLUMNS} FROM products p WHERE p.is_active = 1 AND p.id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];

export const brandCounts = () =>
  all<{ brand: string; n: number }>(`SELECT brand, COUNT(*) AS n FROM products WHERE is_active = 1 AND brand != '' GROUP BY brand ORDER BY brand`);

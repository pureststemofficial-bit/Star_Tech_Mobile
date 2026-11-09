import { all, get } from './db.ts';
import type { BlogPost } from './types.ts';

/* Reads for the public blog. Articles are written in Admin -> Blog; hidden ones never appear here. */
const VISIBLE = 'SELECT * FROM blog_posts WHERE is_active = 1';
const NEWEST_FIRST = 'ORDER BY published DESC, id DESC';
const PER_PAGE = 12;

/** The newest article is featured on page 1, so the numbered grid pages start after it. */
export function blogListing(page: number) {
  const total = get<{ n: number }>('SELECT COUNT(*) AS n FROM blog_posts WHERE is_active = 1')?.n ?? 0;
  const [newest] = all<BlogPost>(`${VISIBLE} ${NEWEST_FIRST} LIMIT 1`);
  const rest = all<BlogPost>(`${VISIBLE} ${NEWEST_FIRST} LIMIT ? OFFSET ?`, PER_PAGE, 1 + (page - 1) * PER_PAGE);
  return { newest: page === 1 ? newest : undefined, rest, pages: Math.max(1, Math.ceil((total - 1) / PER_PAGE)) };
}

export const findPost = (slug: string) => get<BlogPost>(`${VISIBLE} AND slug = ?`, slug);

export const otherPosts = (id: number, limit: number) => all<BlogPost>(`${VISIBLE} AND id != ? ${NEWEST_FIRST} LIMIT ?`, id, limit);

/** Estimated reading time at about 200 words a minute. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

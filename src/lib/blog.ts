import { all, get, run } from './db.ts';
import type { BlogPost } from './types.ts';
import { analyzeSeo, draftFor, peersFor, type SeoFields, type SeoLang, type SeoSetup } from './seo.ts';
import { siteUrl } from './config.ts';
import { localizedSettings } from './store.ts';

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

/* ---------- SEO (admin) ---------- */

const SEO_COLUMNS = `id, slug, title, title_pt, excerpt, excerpt_pt, body, body_pt, focus_keyword, focus_keyword_pt,
  seo_title, seo_title_pt, seo_description, seo_description_pt, image_alt, image_alt_pt, related_keywords, related_keywords_pt`;

export type SeoRow = SeoFields & { id: number; slug: string };

/** Every article's SEO fields, hidden ones included: drafts still compete for keywords once published. */
export const seoRows = () => all<SeoRow>(`SELECT ${SEO_COLUMNS} FROM blog_posts ${NEWEST_FIRST}`);

/** Everything the editor's live SEO panel needs besides the article itself. */
export function seoSetup(selfId?: number): SeoSetup {
  const rows = seoRows();
  const base = siteUrl();
  return {
    siteName: { en: localizedSettings('en').site_name, pt: localizedSettings('pt').site_name },
    host: base?.host ?? 'localhost:3000',
    peers: { en: peersFor(rows, 'en', selfId), pt: peersFor(rows, 'pt', selfId) },
    history: selfId ? seoHistory(selfId) : { en: [], pt: [] },
  };
}

export type SeoListRow = SeoRow & Pick<BlogPost, 'category' | 'published' | 'thumb' | 'is_active' | 'updated_at'>;

const siteNames = () => ({ en: localizedSettings('en').site_name, pt: localizedSettings('pt').site_name });

function scoreRow(row: SeoRow, rows: SeoRow[], siteName: Record<SeoLang, string>, lang: SeoLang) {
  const draft = draftFor(row, lang);
  return draft ? analyzeSeo(draft, { lang, slug: row.slug, siteName: siteName[lang], peers: peersFor(rows, lang, row.id), checkSlug: lang === 'en' }) : null;
}

/** Every article scored in both languages, with the first score on record, for the Admin -> Blog dashboard. */
export function seoOverview() {
  const rows = all<SeoListRow>(`SELECT ${SEO_COLUMNS}, category, published, thumb, is_active, updated_at FROM blog_posts ${NEWEST_FIRST}`);
  const names = siteNames();
  const first = new Map(all<{ post_id: number; score: number }>(
    `SELECT post_id, score FROM blog_seo_history h WHERE lang = 'en' AND day = (SELECT MIN(day) FROM blog_seo_history WHERE post_id = h.post_id AND lang = 'en')`,
  ).map((r) => [r.post_id, r.score]));
  return rows.map((row) => ({ row, en: scoreRow(row, rows, names, 'en')!, pt: scoreRow(row, rows, names, 'pt'), firstScore: first.get(row.id) }));
}

/** Saves today's score for both languages (called after every save of the article). */
export function recordSeoScores(postId: number) {
  const rows = seoRows();
  const row = rows.find((r) => r.id === postId);
  if (!row) return;
  const names = siteNames();
  for (const lang of ['en', 'pt'] as const) {
    const report = scoreRow(row, rows, names, lang);
    if (report) {
      run(`INSERT INTO blog_seo_history (post_id, lang, day, score) VALUES (?, ?, date('now'), ?)
           ON CONFLICT (post_id, lang, day) DO UPDATE SET score = excluded.score`, postId, lang, report.score);
    } else {
      run(`DELETE FROM blog_seo_history WHERE post_id = ? AND lang = ? AND day = date('now')`, postId, lang);
    }
  }
}

/** The last 30 recorded scores of an article, oldest first. */
export function seoHistory(postId: number): SeoSetup['history'] {
  const out: SeoSetup['history'] = { en: [], pt: [] };
  const rows = all<{ lang: SeoLang; day: string; score: number }>(
    'SELECT lang, day, score FROM (SELECT lang, day, score FROM blog_seo_history WHERE post_id = ? ORDER BY day DESC LIMIT 60) ORDER BY day', postId);
  for (const r of rows) out[r.lang].push({ day: r.day, score: r.score });
  for (const l of ['en', 'pt'] as const) out[l] = out[l].slice(-30);
  return out;
}

/* Blog queries and the one-time starter articles, against a throwaway database: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BlogPost } from '../src/lib/types.ts';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'startech-blog-'));
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass12345';
const silence = console.log;
console.log = () => {};
const { get, all, run } = await import('../src/lib/db.ts');
const { blogListing, findPost, otherPosts, readingMinutes, recordSeoScores, seoHistory, seoOverview, seoSetup } = await import('../src/lib/blog.ts');
const { render } = await import('../src/lib/markdown.ts');
console.log = silence;

const count = () => get<{ n: number }>('SELECT COUNT(*) AS n FROM blog_posts')!.n;
const addPost = (slug: string, published: string, isActive = 1) => run(
  `INSERT INTO blog_posts (slug, published, image, thumb, category, title, excerpt, body, is_active) VALUES (?, ?, '/i.webp', '/t.webp', 'Tips', ?, 'Summary', 'Body', ?)`,
  slug, published, slug, isActive);

test('starter articles are complete in both languages and their images exist', () => {
  const posts = all<BlogPost>('SELECT * FROM blog_posts');
  assert.equal(posts.length, 4);
  for (const post of posts) {
    assert.match(post.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(fs.existsSync(`public${post.image}`), post.image);
    for (const field of ['title_pt', 'excerpt_pt', 'category_pt', 'cta_label_pt'] as const) assert.ok(post[field].trim(), `${post.slug} ${field}`);
    assert.equal(render(post.body).split('<h2>').length, render(post.body_pt).split('<h2>').length, `${post.slug} sections differ between languages`);
  }
});

test('starter articles target distinct focus keywords in both languages', () => {
  const posts = all<BlogPost>('SELECT * FROM blog_posts');
  for (const lang of ['', '_pt'] as const) {
    const keywords = posts.map((p) => p[`focus_keyword${lang}`].toLowerCase());
    assert.ok(keywords.every(Boolean), `missing focus_keyword${lang}`);
    assert.equal(new Set(keywords).size, keywords.length, `duplicate focus_keyword${lang}`);
    assert.ok(posts.every((p) => p[`related_keywords${lang}`].trim()), `missing related_keywords${lang}`);
  }
});

test('every article is scored for SEO, and saved SEO fields feed the score', () => {
  const before = seoOverview();
  assert.equal(before.length, 4);
  for (const { en, pt } of before) {
    assert.ok(en.score >= 0 && en.score <= 100);
    assert.ok(pt, 'starter articles have Portuguese text');
  }
  const target = before[0].row;
  run("UPDATE blog_posts SET focus_keyword = 'phone', image_alt = 'A phone' WHERE id = ?", target.id);
  assert.equal(seoOverview().find((p) => p.row.id === target.id)!.row.focus_keyword, 'phone');
  const after = seoOverview().find((p) => p.row.id === target.id)!;
  assert.equal(after.en.checks.find((c) => c.id === 'kw-set')?.status, 'good');
  const setup = seoSetup(target.id);
  assert.equal(setup.peers.en.length, 3);
  assert.ok(!setup.peers.en.some((p) => p.id === target.id));
  run('UPDATE blog_posts SET focus_keyword = ?, image_alt = ? WHERE id = ?', target.focus_keyword, target.image_alt, target.id);
});

test('saving records one SEO score per language per day, and deleting the article removes them', () => {
  const id = addPost('seo-history', '2020-01-01').lastInsertRowid;
  recordSeoScores(id);
  recordSeoScores(id);
  const history = seoHistory(id);
  assert.equal(history.en.length, 1);
  assert.equal(history.pt.length, 0, 'no Portuguese text, so no Portuguese score');
  assert.equal(history.en[0].score, seoOverview().find((p) => p.row.id === id)!.en.score);
  assert.equal(seoOverview().find((p) => p.row.id === id)!.firstScore, history.en[0].score);
  run('DELETE FROM blog_posts WHERE id = ?', id);
  assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM blog_seo_history WHERE post_id = ?', id)!.n, 0);
});

test('a deleted starter article does not come back when the app restarts', () => {
  run("DELETE FROM blog_posts WHERE slug = 'choosing-the-right-usb-c-charger'");
  const g = globalThis as typeof globalThis & { __startechDb?: { conn: { close(): void } } };
  g.__startechDb!.conn.close();
  delete g.__startechDb;
  assert.equal(count(), 3);
});

test('hidden articles never reach visitors', () => {
  addPost('secret-draft', '2099-01-01', 0);
  assert.equal(findPost('secret-draft'), undefined);
  assert.ok(findPost('make-your-phone-battery-last'));
  const { newest, rest } = blogListing(1);
  assert.notEqual(newest?.slug, 'secret-draft');
  assert.ok(!rest.some((p) => p.slug === 'secret-draft'));
  assert.ok(!otherPosts(newest!.id, 10).some((p) => p.slug === 'secret-draft' || p.id === newest!.id));
});

test('the newest article is featured once and later pages continue after it', () => {
  run('DELETE FROM blog_posts');
  assert.deepEqual(blogListing(1), { newest: undefined, rest: [], pages: 1 });
  for (let i = 1; i <= 14; i++) addPost(`post-${i}`, `2026-01-${String(i).padStart(2, '0')}`);
  const one = blogListing(1);
  const two = blogListing(2);
  assert.equal(one.newest?.slug, 'post-14');
  assert.equal(one.rest.length, 12);
  assert.equal(one.pages, 2);
  assert.equal(two.newest, undefined);
  assert.deepEqual(two.rest.map((p) => p.slug), ['post-1']);
});

test('reading time is at least one minute', () => {
  assert.equal(readingMinutes('one two three'), 1);
  assert.equal(readingMinutes(Array(600).fill('word').join(' ')), 3);
});

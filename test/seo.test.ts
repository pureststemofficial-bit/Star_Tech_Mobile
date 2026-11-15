/* Blog SEO scoring and article links: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSeo, countPhrase, draftFor, linkSuggestions, normalize, parseBody, type SeoDraft, type SeoFields } from '../src/lib/seo.ts';
import { render } from '../src/lib/markdown.ts';

const para = (s: string, n: number) => Array.from({ length: n }, () => s).join(' ');

const strong: SeoDraft = {
  title: 'Cracked phone screen: what to do first',
  seoTitle: '',
  excerpt: 'Got a cracked phone screen? These simple steps protect your data and stop a small crack turning into a costly repair today.',
  seoDescription: '',
  keyword: 'cracked phone screen',
  imageAlt: 'A cracked phone screen on a wooden table',
  related: 'screen repair, broken glass',
  body: [
    `A cracked phone screen rarely stops a phone working straight away. ${para('Back up your photos and keep the phone dry.', 12)}`,
    '## Why a cracked phone screen gets worse',
    para('Small cracks spread when the phone flexes in a pocket. Dust gets in and the broken glass weakens, so act fast.', 14),
    '## Protect it until the repair',
    '- Use a screen protector',
    '- Keep it in a case',
    para('Bring it to the shop for a quote. For example, a screen repair often takes under an hour.', 14),
    'Read our [repairs page](/repairs) or the [Apple guide](https://support.apple.com).',
    'A cracked phone screen is quick to fix.',
  ].join('\n\n'),
};
const ctx = { lang: 'en' as const, slug: 'cracked-phone-screen-what-to-do', siteName: 'Startech Mobile', checkSlug: true };

test('keyword matching ignores case, accents and punctuation but needs whole words', () => {
  assert.equal(normalize('Ecrã  PARTIDO!'), 'ecra partido');
  assert.equal(countPhrase('My Cracked-Phone screen; cracked phone screens', 'cracked phone screen'), 1);
  assert.equal(countPhrase('ecrã partido e outro ecra partido', 'Ecrã partido'), 2);
  assert.equal(countPhrase('anything', ''), 0);
});

test('the body parser finds headings, lists, links and section sizes', () => {
  const p = parseBody('Intro **bold** [a](/x)\n\n## One\ntext here\n\n- a\n- b\n\n### Two\nmore [b](https://e.com)');
  assert.deepEqual(p.headings, ['One', 'Two']);
  assert.deepEqual(p.links, ['/x', 'https://e.com']);
  assert.equal(p.lists, 1);
  assert.equal(p.paragraphs[0], 'Intro bold a');
  assert.deepEqual(p.sectionWords, [3, 4, 2]);
});

test('a well-optimised article scores well and an empty one scores poorly', () => {
  const good = analyzeSeo(strong, ctx);
  const failing = good.checks.filter((c) => c.status === 'bad').map((c) => c.id);
  assert.deepEqual(failing, []);
  assert.ok(good.score >= 80, `score ${good.score}`);
  assert.equal(good.stats.internalLinks, 1);
  assert.equal(good.stats.externalLinks, 1);
  assert.equal(good.stats.displayTitle, 'Cracked phone screen: what to do first | Startech Mobile');

  const weak = analyzeSeo({ ...strong, keyword: '', body: 'Short.', imageAlt: '', excerpt: '' }, ctx);
  assert.equal(weak.status, 'bad');
  assert.ok(weak.checks.some((c) => c.id === 'kw-set' && c.status === 'bad'));
});

test('custom SEO title and description replace the defaults', () => {
  const r = analyzeSeo({ ...strong, seoTitle: 'Broken screen help', seoDescription: 'Custom text' }, ctx);
  assert.equal(r.stats.displayTitle, 'Broken screen help');
  assert.equal(r.stats.displayDescription, 'Custom text');
  assert.equal(r.checks.find((c) => c.id === 'kw-title')?.status, 'bad');
});

test('keyword stuffing and keyword clashes with other articles are flagged', () => {
  const stuffed = analyzeSeo({ ...strong, body: para('cracked phone screen help', 60) }, ctx);
  assert.equal(stuffed.checks.find((c) => c.id === 'kw-density')?.status, 'bad');

  const peers = [{ id: 9, slug: 'other', title: 'Another', keyword: 'Cracked Phone Screen' }];
  const clash = analyzeSeo(strong, { ...ctx, peers });
  assert.equal(clash.checks.find((c) => c.id === 'kw-unique')?.status, 'bad');
});

test('the Portuguese draft falls back to English fields, and is absent without Portuguese text', () => {
  const row = Object.fromEntries(['title', 'title_pt', 'excerpt', 'excerpt_pt', 'body', 'body_pt', 'focus_keyword', 'focus_keyword_pt',
    'seo_title', 'seo_title_pt', 'seo_description', 'seo_description_pt', 'image_alt', 'image_alt_pt', 'related_keywords', 'related_keywords_pt'].map((k) => [k, ''])) as SeoFields;
  Object.assign(row, { title: 'EN title', excerpt: 'EN summary', body: 'EN body', image_alt: 'EN alt' });
  assert.equal(draftFor(row, 'pt'), null);
  row.body_pt = 'Texto';
  assert.deepEqual(draftFor(row, 'pt'), { title: 'EN title', seoTitle: '', excerpt: 'EN summary', seoDescription: '', body: 'Texto', keyword: '', imageAlt: 'EN alt', related: '' });
});

test('related keyphrases, transition words and passive voice are checked', () => {
  const check = (draft: SeoDraft, id: string) => analyzeSeo(draft, ctx).checks.find((c) => c.id === id)?.status;
  assert.equal(check(strong, 'kw-related'), 'good');
  assert.equal(check({ ...strong, related: 'water damage' }, 'kw-related'), 'bad');
  assert.equal(check({ ...strong, related: '' }, 'kw-related'), 'ok');
  const passive = para('The screen was replaced by the team. The battery is tested. The case was fitted.', 10);
  assert.equal(check({ ...strong, body: passive }, 'read-passive'), 'bad');
  assert.equal(check({ ...strong, body: para('We replace the screen. Then we test the battery.', 10) }, 'read-passive'), 'good');
  assert.equal(check({ ...strong, body: para('The phone is new. The case is blue. The box is small.', 10) }, 'read-transitions'), 'bad');
});

test('each check says how many points fixing it is worth, and a perfect article has nothing left', () => {
  const r = analyzeSeo({ ...strong, keyword: '' }, ctx);
  const set = r.checks.find((c) => c.id === 'kw-set')!;
  assert.ok(set.gain > 0);
  assert.equal(Math.round(r.checks.filter((c) => c.status === 'good').reduce((a, c) => a + c.gain, 0)), 0);
  assert.ok(Math.abs(r.score + r.checks.reduce((a, c) => a + c.gain, 0) - 100) < 1);
});

test('link suggestions skip articles that are already linked', () => {
  const peers = [
    { id: 1, slug: 'battery-tips', title: 'Make your battery last', keyword: 'phone battery' },
    { id: 2, slug: 'chargers', title: 'Choosing a charger', keyword: 'usb c charger' },
  ];
  assert.deepEqual(linkSuggestions('Your phone battery wears out. A charger matters.', peers).map((p) => p.id), [1, 2]);
  assert.deepEqual(linkSuggestions('Your phone battery wears out. [tips](/blog/battery-tips)', peers).map((p) => p.id), []);
});

test('article links render only for safe destinations', () => {
  assert.equal(render('See [repairs](/repairs).'), '<p>See <a href="/repairs">repairs</a>.</p>');
  assert.equal(render('[Apple](https://apple.com)'), '<p><a href="https://apple.com" target="_blank" rel="noopener noreferrer">Apple</a></p>');
  assert.equal(render('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  assert.equal(render('[x](//evil.com)'), '<p>[x](//evil.com)</p>');
  assert.equal(render('[<b>](/a"onclick=x)'), '<p><a href="/a&quot;onclick=x">&lt;b&gt;</a></p>');
});

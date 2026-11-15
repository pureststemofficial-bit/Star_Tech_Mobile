/* Product SEO scoring, and product SEO data against a throwaway database: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeProductSeo, productDraftFor, type ProductSeoDraft, type ProductSeoFields } from '../src/lib/product-seo.ts';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'startech-product-seo-'));
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass12345';
const silence = console.log;
console.log = () => {};
const { get, run } = await import('../src/lib/db.ts');
const { productSeoOverview, productSeoSetup, recordProductSeoScores, productSeoHistory } = await import('../src/lib/product-seo-admin.ts');
console.log = silence;

const para = (s: string, n: number) => Array.from({ length: n }, () => s).join(' ');

const strong: ProductSeoDraft = {
  name: 'Anker USB-C charger 65W',
  seoTitle: '',
  shortDesc: 'The Anker USB-C charger 65W powers a laptop, tablet and phone at full speed from one small plug, with fast charging for every device.',
  seoDescription: '',
  description: [
    `This Anker USB-C charger delivers 65W of fast charging. ${para('It charges a laptop, a tablet and a phone quickly and safely.', 6)}`,
    para('The compact design folds flat, so it fits in any bag. A smart chip picks the right power for each device.', 6),
  ].join('\n\n'),
  features: '65W fast charging\nThree ports\nFoldable plug',
  specs: 'Power: 65W\nPorts: 2x USB-C, 1x USB-A\nWeight: 112 g\nSize: 4 x 4 x 3 cm',
  keyword: 'USB-C charger',
  related: 'fast charging, laptop charger',
  imageAlt: 'Anker USB-C charger 65W with folded plug',
  brand: 'Anker',
  category: 'Chargers & Cables',
  images: 3,
};
const ctx = { lang: 'en' as const, slug: 'anker-usb-c-charger-65w', siteName: 'Startech Mobile', checkSlug: true };

test('a complete product page scores well and a bare one scores poorly', () => {
  const good = analyzeProductSeo(strong, ctx);
  assert.deepEqual(good.checks.filter((c) => c.status === 'bad').map((c) => c.id), []);
  assert.ok(good.score >= 80, `score ${good.score}`);
  assert.equal(good.stats.images, 3);
  assert.equal(good.stats.features, 3);
  assert.equal(good.stats.specs, 4);

  const bare = analyzeProductSeo({ ...strong, keyword: '', description: '', features: '', specs: '', images: 0, category: '', shortDesc: '' }, ctx);
  assert.equal(bare.status, 'bad');
  for (const id of ['kw-set', 'content-length', 'content-features', 'content-specs', 'content-images', 'content-category']) {
    assert.equal(bare.checks.find((c) => c.id === id)?.status, 'bad', id);
  }
});

test('photos, specifications and keyword clashes are judged per product', () => {
  const check = (d: Partial<ProductSeoDraft>, id: string, extra = {}) => analyzeProductSeo({ ...strong, ...d }, { ...ctx, ...extra }).checks.find((c) => c.id === id)?.status;
  assert.equal(check({ images: 1 }, 'content-images'), 'ok');
  assert.equal(check({ specs: 'Power 65W\nno colon here' }, 'content-specs'), 'bad');
  const peers = [{ id: 1, slug: 'self', title: 'Me', keyword: 'usb-c charger' }, { id: 2, slug: 'other', title: 'Other charger', keyword: 'USB-C Charger' }];
  assert.equal(check({}, 'kw-unique', { peers: peers.slice(0, 1), selfId: 1 }), 'good', 'a product never clashes with itself');
  assert.equal(check({}, 'kw-unique', { peers, selfId: 1 }), 'bad');
});

test('the Portuguese product draft falls back to English and needs some Portuguese text', () => {
  const keys = ['name', 'name_pt', 'short_desc', 'short_desc_pt', 'description', 'description_pt', 'features', 'features_pt', 'specs', 'specs_pt', 'brand',
    'focus_keyword', 'focus_keyword_pt', 'related_keywords', 'related_keywords_pt', 'seo_title', 'seo_title_pt', 'seo_description', 'seo_description_pt', 'image_alt', 'image_alt_pt'];
  const row = Object.fromEntries(keys.map((k) => [k, ''])) as ProductSeoFields;
  Object.assign(row, { name: 'Charger', description: 'English text', features: 'Fast', image_alt: 'A charger' });
  const extra = { category: { en: 'Chargers', pt: 'Carregadores' }, images: 2 };
  assert.equal(productDraftFor(row, 'pt', extra), null);
  row.name_pt = 'Carregador';
  const pt = productDraftFor(row, 'pt', extra)!;
  assert.equal(pt.name, 'Carregador');
  assert.equal(pt.description, 'English text');
  assert.equal(pt.features, 'Fast');
  assert.equal(pt.imageAlt, 'A charger');
  assert.equal(pt.category, 'Carregadores');
});

test('every product is scored, saved SEO fields count, and saving records history', () => {
  const overview = productSeoOverview();
  assert.ok(overview.length > 0);
  const target = overview[0].row;
  run("UPDATE products SET focus_keyword = 'test phrase' WHERE id = ?", target.id);
  const after = productSeoOverview().find((p) => p.row.id === target.id)!;
  assert.equal(after.en.checks.find((c) => c.id === 'kw-set')?.status, 'good');

  const setup = productSeoSetup(target.id);
  assert.ok(!setup.peers.en.some((p) => p.id === target.id));
  assert.ok(Object.keys(setup.categories ?? {}).length > 0);

  recordProductSeoScores(target.id);
  recordProductSeoScores(target.id);
  assert.equal(productSeoHistory(target.id).en.length, 1);
  assert.equal(productSeoOverview().find((p) => p.row.id === target.id)!.firstScore, after.en.score);
  run('DELETE FROM products WHERE id = ?', target.id);
  assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM product_seo_history WHERE product_id = ?', target.id)!.n, 0);
});

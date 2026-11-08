/* Security- and money-critical library checks against a throwaway database: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'startech-test-'));
process.env.DATA_DIR = tmp;
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass12345';
const silence = console.log;
console.log = () => {};

// Imported after the env is set so the database is created in the temp folder.
const { get, run } = await import('../src/lib/db.ts');
const cart = await import('../src/lib/cart.ts');
const catalog = await import('../src/lib/catalog.ts');
const { render } = await import('../src/lib/markdown.ts');
const { hashPassword, verifyPassword, passwordProblem } = await import('../src/lib/password.ts');
const { safeRedirectPath, toPence } = await import('../src/lib/helpers.ts');
const { str, isEmail } = await import('../src/lib/validate.ts');
const { removeUpload, UPLOAD_NAME } = await import('../src/lib/images.ts');
const { pick } = await import('../src/lib/i18n/config.ts');
const { messages, format } = await import('../src/lib/i18n/messages.ts');
const { money } = await import('../src/lib/format.ts');
const { isPostcode } = await import('../src/lib/validate.ts');
const store = await import('../src/lib/store.ts');
console.log = silence;

test('database is seeded with demo catalogue, pages and admin', () => {
  assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM products')!.n, 24);
  assert.ok(get("SELECT 1 AS x FROM pages WHERE slug = 'terms'"));
  assert.equal(get<{ role: string }>("SELECT role FROM users WHERE email = 'admin@test.local'")!.role, 'admin');
});

test('passwords are hashed with scrypt and verified in constant time', async () => {
  const hash = await hashPassword('GoodPass123');
  assert.match(hash, /^scrypt\$/);
  assert.ok(!hash.includes('GoodPass123'));
  assert.equal(await verifyPassword('GoodPass123', hash), true);
  assert.equal(await verifyPassword('WrongPass123', hash), false);
  assert.equal(await verifyPassword('anything', null), false); // unknown account
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem('onlyletters'));
  assert.equal(passwordProblem('GoodPass123'), null);
});

test('cart prices always come from the database, never the session', () => {
  const p = get<{ id: number; price_pence: number; colours: string; options: string }>(
    "SELECT id, price_pence, colours, options FROM products WHERE slug = 'iphone-15-pro'")!;
  const session = {};
  cart.add(session, p, { option: '256GB', colour: 'Blue Titanium', qty: 2 });
  cart.add(session, p, { option: 'FREE-PHONE', colour: '<script>', qty: 999 }); // invalid variant + qty
  const s = cart.summary(session);
  assert.equal(s.lines[0].unit, p.price_pence + 10000);
  assert.equal(s.lines[1].option, '128GB'); // unknown option falls back to a real one
  assert.equal(s.lines[1].colour, 'Natural Titanium');
  assert.ok(s.lines.every((l) => l.qty <= cart.MAX_QTY));

  // A tampered session (e.g. injected price field) changes nothing.
  const tampered = { cart: [{ productId: p.id, colour: '', option: '', qty: 1, price: 1 }] };
  assert.equal(cart.summary(tampered).subtotal, p.price_pence);

  // Hidden products drop out of carts.
  run('UPDATE products SET is_active = 0 WHERE id = ?', p.id);
  assert.equal(cart.summary(session).lines.length, 0);
  run('UPDATE products SET is_active = 1 WHERE id = ?', p.id);
});

test('product search is injection-safe', () => {
  assert.equal(catalog.search({ q: "' OR 1=1 --" }).total, 0);
  assert.equal(catalog.search({ q: '%' }).total, 0); // LIKE wildcards are escaped
  assert.equal(catalog.search({ brands: ["Apple' OR '1'='1"] }).total, 0);
  assert.ok(catalog.search({ q: 'iphone' }).total >= 2);
  assert.equal(catalog.search({ prices: ['500+'] }).items.every((p) => p.price_pence >= 50000), true);
});

test('admin page content cannot inject HTML', () => {
  const html = render('## Title\n<img src=x onerror=alert(1)>\n- **bold** <script>x</script>');
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
});

test('redirects, money and input helpers', () => {
  assert.equal(safeRedirectPath('//evil.example'), '/');
  assert.equal(safeRedirectPath('https://evil.example'), '/');
  assert.equal(safeRedirectPath('/\\evil.example'), '/');
  assert.equal(safeRedirectPath('/account/orders'), '/account/orders');
  assert.equal(toPence('£1,299.99'), 129999);
  assert.equal(toPence('-5'), null);
  assert.equal(toPence('1e9'), null);
  assert.equal(str('  hi\u0000there  ', 5), 'hithe');
  assert.equal(isEmail('a@b.co'), true);
  assert.equal(isEmail('a@b'), false);
});

test('upload deletion cannot escape the uploads folder', () => {
  assert.equal(UPLOAD_NAME.test('../../etc/passwd'), false);
  assert.equal(UPLOAD_NAME.test('3f2b8c1e-0000-4000-8000-000000000000.webp'), true);
  assert.doesNotThrow(() => removeUpload('/uploads/../../package.json'));
  assert.ok(fs.existsSync(path.join(process.cwd(), 'package.json')));
});

test('every interface string exists in both languages', () => {
  const en = Object.keys(messages.en).sort();
  assert.deepEqual(Object.keys(messages.pt).sort(), en);
  for (const key of en) {
    const vars = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(vars(messages.pt[key as keyof typeof messages.pt]), vars(messages.en[key as keyof typeof messages.en]), key);
  }
  assert.equal(format('Hi {name}', { name: 'Ana' }), 'Hi Ana');
});

test('translated content falls back to English when blank', () => {
  assert.equal(pick({ name: 'Mouse', name_pt: 'Rato' }, 'name', 'pt'), 'Rato');
  assert.equal(pick({ name: 'Mouse', name_pt: '  ' }, 'name', 'pt'), 'Mouse');
  assert.equal(pick({ name: 'Mouse', name_pt: 'Rato' }, 'name', 'en'), 'Mouse');
  assert.match(money(69900, 'pt'), /699,00/);
  assert.match(money(69900), /£699\.00/);
  assert.ok(isPostcode('1000-001'));
});

test('demo catalogue is upgraded with Portuguese copy and photos', () => {
  const p = get<{ id: number; name_pt: string; short_desc_pt: string; specs: string }>("SELECT id, name_pt, short_desc_pt, specs FROM products WHERE slug = 'logitech-g502-mouse'")!;
  assert.equal(p.name_pt, 'Rato Logitech G502');
  assert.ok(p.short_desc_pt.length > 10);
  assert.ok(!p.specs.includes('Highlight:'));
  assert.match(get<{ path: string }>('SELECT path FROM product_images WHERE product_id = ?', p.id)!.path, /\.webp$/);
});

test('form options keep the English value while showing a translated label', () => {
  const [first] = store.localizedOptions('repair_device_types', 'pt');
  assert.deepEqual(first, { value: 'Mobile Phone', label: 'Telemóvel' });
  assert.equal(store.paymentLabel('nonsense', 'pt'), 'nonsense');
  assert.equal(store.localizedSettings('pt').repair_title, 'Marcar uma reparação');
});

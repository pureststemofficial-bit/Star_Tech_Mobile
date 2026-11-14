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
const { siteUrl } = await import('../src/lib/config.ts');
const { EUR_PER_GBP, euroOptions, euroText } = await import('../src/lib/euro.ts');
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
  assert.equal(s.lines[0].unit, p.price_pence + Math.round(10000 * EUR_PER_GBP));
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
  assert.equal(toPence('€1,299.99'), 129999);
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
  assert.match(money(69900), /€699\.00/);
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

test('a badly written SITE_URL can never crash the site', () => {
  assert.equal(siteUrl('startechmobile.com')?.origin, 'https://startechmobile.com');
  assert.equal(siteUrl(' https://startechmobile.com/ ')?.origin, 'https://startechmobile.com');
  assert.equal(siteUrl('not a url at all'), null);
  assert.equal(siteUrl(''), null);
});

test('a Stripe session settles an order once, whichever notice arrives first', async () => {
  const { settleSession } = await import('../src/lib/payments.ts');
  const { id: productId, stock } = get<{ id: number; stock: number }>('SELECT id, stock FROM products LIMIT 1')!;
  const place = (number: string, session: string) => {
    run('UPDATE products SET stock = stock - 1 WHERE id = ?', productId);
    const o = run(`INSERT INTO orders (order_number, email, full_name, line1, city, postcode, subtotal_pence, delivery_pence, total_pence, stripe_session_id)
                   VALUES (?, 'a@b.co', 'A B', '1 St', 'London', 'E1 6AN', 100, 0, 100, ?)`, number, session);
    run(`INSERT INTO order_items (order_id, product_id, name, price_pence, qty) VALUES (?, ?, 'x', 100, 1)`, o.lastInsertRowid, productId);
  };
  const order = (number: string) => get<{ status: string; payment_status: string }>('SELECT status, payment_status FROM orders WHERE order_number = ?', number)!;
  const stockNow = () => get<{ stock: number }>('SELECT stock FROM products WHERE id = ?', productId)!.stock;

  assert.equal(settleSession({ id: 'cs_unknown', status: 'complete', payment_status: 'paid' }), null);

  place('T-PAID', 'cs_paid');
  assert.equal(settleSession({ id: 'cs_paid', status: 'open', payment_status: 'unpaid' })?.state, 'open');
  assert.equal(order('T-PAID').payment_status, 'unpaid');
  for (let i = 0; i < 2; i++) assert.equal(settleSession({ id: 'cs_paid', status: 'complete', payment_status: 'paid' })?.state, 'paid');
  assert.equal(order('T-PAID').payment_status, 'paid');
  assert.equal(stockNow(), stock - 1);

  place('T-GONE', 'cs_gone');
  for (let i = 0; i < 2; i++) assert.equal(settleSession({ id: 'cs_gone', status: 'expired', payment_status: 'unpaid' })?.state, 'cancelled');
  assert.equal(order('T-GONE').status, 'cancelled');
  assert.equal(stockNow(), stock - 1, 'stock returned exactly once');
});

test('the switch to euros converts every kind of amount exactly once', () => {
  const version = () => Number(get<{ user_version: number }>('PRAGMA user_version')!.user_version);
  assert.equal(version(), 6);
  assert.equal(get<{ price_pence: number }>("SELECT price_pence FROM products WHERE slug = 'iphone-15-pro'")!.price_pence, Math.round(69900 * EUR_PER_GBP));
  assert.equal(euroOptions('128GB\n256GB|+100\n1TB|+£500'), '128GB\n256GB|+119.86\n1TB|+599.30');
  assert.equal(euroText('Free over £50, or £1,000.50'), 'Free over €59.93, or €1199.20');
  assert.equal(euroText('Acima de 50 £'), 'Acima de 59,93 €');
  assert.equal(euroText('Prices in pounds sterling (GBP)'), 'Prices in euros (EUR)');
  assert.equal(euroText('Already €59.93'), 'Already €59.93');
});

test('real shop details replace the demo ones but never an admin edit', async () => {
  const { applyShopDetails, SHOP_DETAILS } = await import('../src/lib/shop-details.ts');
  assert.equal(store.settings().email, SHOP_DETAILS.email);
  const value = (key: string) => get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)!.value;
  run(`INSERT INTO settings (key, value) VALUES ('phone', '+44 20 7123 4567'), ('email', 'owner@shop.example')`);
  applyShopDetails({ run });
  assert.equal(value('phone'), SHOP_DETAILS.phone);
  assert.equal(value('email'), 'owner@shop.example');
  run(`DELETE FROM settings WHERE key IN ('phone', 'email')`);
});

test('old UK wording in the database is rewritten for Portugal', async () => {
  const { applyPortugal } = await import('../src/lib/shop-details.ts');
  run(`INSERT INTO settings (key, value) VALUES ('announcement', 'UK Based · Fast Delivery · Expert Repairs')`);
  run(`UPDATE pages SET subtitle = 'Fast UK delivery', subtitle_pt = 'Entrega rápida no Reino Unido' WHERE slug = 'delivery'`);
  applyPortugal({ run });
  assert.equal(get<{ value: string }>("SELECT value FROM settings WHERE key = 'announcement'")!.value, 'Based in Portugal · Fast Delivery · Expert Repairs');
  const page = get<{ subtitle: string; subtitle_pt: string }>("SELECT subtitle, subtitle_pt FROM pages WHERE slug = 'delivery'")!;
  assert.deepEqual([page.subtitle, page.subtitle_pt], ['Fast delivery in Portugal', 'Entrega rápida em Portugal']);
  assert.equal(get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE description LIKE '%UK%' OR description_pt LIKE '%Reino Unido%'")!.n, 0);
  run(`DELETE FROM settings WHERE key = 'announcement'`);
});

test('free delivery is withdrawn, so every order pays the delivery fee', async () => {
  const { removeFreeDelivery } = await import('../src/lib/shop-details.ts');
  assert.equal(store.settings().freeDeliveryPence, 0);
  run(`INSERT INTO settings (key, value) VALUES ('free_delivery_pence', '5993'), ('features', 'Free Delivery in Portugal|On orders over €59.93\nExpert Support|Here to help')`);
  run(`UPDATE pages SET body = 'Free on orders over €59.93. Otherwise a small delivery charge applies, shown at checkout.' WHERE slug = 'delivery'`);
  removeFreeDelivery({ run });
  store.invalidate();
  assert.equal(store.settings().freeDeliveryPence, 0);
  assert.equal(store.settings().features, 'Fast Delivery in Portugal|Same-day dispatch before 2pm\nExpert Support|Here to help');
  assert.equal(get<{ body: string }>("SELECT body FROM pages WHERE slug = 'delivery'")!.body, 'A delivery charge applies to every order and is shown at checkout.');
  run(`DELETE FROM settings WHERE key IN ('free_delivery_pence', 'features')`);
  store.invalidate();
});

test('delivery is charged by the city the customer chooses', async () => {
  const { cityFee, deliveryCities } = await import('../src/lib/delivery.ts');
  const { PORTUGAL_DISTRICTS } = await import('../src/lib/portugal.ts');
  const { deliveryCharge } = await import('../src/lib/delivery-charge.ts');
  const listed = PORTUGAL_DISTRICTS.flatMap(([, cities]) => cities);
  assert.equal(listed.length, 308, 'all 308 municipalities');
  assert.equal(new Set(listed).size, 308, 'names are unique');
  assert.equal(deliveryCities().length, 308);

  const fallback = store.settings().deliveryFeePence;
  assert.equal(cityFee('Lisboa'), fallback, 'no charge of its own -> default');
  run("UPDATE delivery_cities SET fee_pence = 350 WHERE name = 'Lisboa'");
  run("UPDATE delivery_cities SET fee_pence = 0 WHERE name = 'Vila Franca de Xira'");
  assert.equal(cityFee('Lisboa'), 350);
  assert.equal(cityFee('Vila Franca de Xira'), 0);
  assert.equal(cityFee('London'), undefined, 'unlisted places are refused');

  const p = get<{ id: number; price_pence: number; colours: string; options: string; stock: number; name: string }>("SELECT * FROM products WHERE slug = 'iphone-15'")!;
  const session = {} as Parameters<typeof cart.summary>[0] & object;
  cart.add(session, p, { qty: 1 });
  assert.equal(cart.summary(session, 'Lisboa').delivery, 350);
  assert.equal(cart.summary(session, 'Vila Franca de Xira').delivery, 0);
  assert.equal(cart.summary(session, 'Porto').delivery, fallback);
  assert.equal(cart.summary(session).delivery, fallback);

  assert.equal(deliveryCharge(0, 500, 0), 0, 'empty basket');
  assert.equal(deliveryCharge(1000, 500, 1000), 0, 'free-delivery threshold still wins');
  assert.equal(deliveryCharge(999, 500, 1000), 500);
  run('UPDATE delivery_cities SET fee_pence = NULL');
});

test('deleting an order removes its items and returns unsent stock', async () => {
  const { removeOrder } = await import('../src/lib/orders.ts');
  const p = get<{ id: number; stock: number }>("SELECT id, stock FROM products WHERE slug = 'iphone-15'")!;
  const place = (number: string, status: string) => {
    run('UPDATE products SET stock = stock - 2 WHERE id = ?', p.id);
    const o = run(`INSERT INTO orders (order_number, email, full_name, line1, city, postcode, subtotal_pence, delivery_pence, total_pence, status)
                   VALUES (?, 'a@b.pt', 'Test', 'Rua 1', 'Lisboa', '1000-001', 100, 0, 100, ?)`, number, status);
    run('INSERT INTO order_items (order_id, product_id, name, variant, image, price_pence, qty) VALUES (?, ?, ?, ?, ?, ?, ?)', o.lastInsertRowid, p.id, 'iPhone 15', '', '', 100, 2);
    return o.lastInsertRowid;
  };
  const stock = () => get<{ stock: number }>('SELECT stock FROM products WHERE id = ?', p.id)!.stock;

  const pending = place('DEL-1', 'processing');
  assert.equal(removeOrder(pending), 'DEL-1');
  assert.equal(stock(), p.stock, 'unsent items go back into stock');
  assert.equal(get<{ n: number }>('SELECT COUNT(*) AS n FROM order_items WHERE order_id = ?', pending)!.n, 0, 'items deleted too');

  const sent = place('DEL-2', 'delivered');
  removeOrder(sent);
  assert.equal(stock(), p.stock - 2, 'delivered goods are not restocked');
  assert.equal(get('SELECT 1 AS x FROM orders WHERE id = ?', sent), undefined);
  assert.equal(removeOrder(999999), null);
  run('UPDATE products SET stock = ? WHERE id = ?', p.stock, p.id);
});

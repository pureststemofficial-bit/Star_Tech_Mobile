import crypto from 'node:crypto';
import { hashPasswordSync } from './password.ts';
import { applyContent } from './content.ts';
import type { Db } from './db.ts';

/*
 * Demo catalogue, information pages and the first admin account. Artwork is in public/img (npm run generate-art).
 * Catalogue prices and option extras are in pounds; euro.ts converts them right after seeding.
 */

const CATEGORIES = [
  { slug: 'mobile-phones', name: 'Mobile Phones', nav: 'Phones', inNav: 1, home: 1, art: ['phone', { color: '#2b3a67', accent: '#1d2747' }] },
  { slug: 'accessories', name: 'Accessories', nav: 'Accessories', inNav: 1, home: 1, art: ['charger', {}] },
  { slug: 'headphones', name: 'Headphones & Earphones', nav: 'Headphones', inNav: 0, home: 1, art: ['headphones', {}] },
  { slug: 'gaming', name: 'Gaming', nav: 'Gaming', inNav: 1, home: 1, art: ['gamepad', { color: '#1b1d22' }] },
  { slug: 'laptops', name: 'Laptops', nav: 'Laptops', inNav: 1, home: 1, art: ['laptop', {}] },
  { slug: 'chargers-cables', name: 'Chargers & Cables', nav: '', inNav: 0, home: 0, art: ['cable', {}] },
  { slug: 'mobile-covers', name: 'Mobile Covers', nav: '', inNav: 0, home: 0, art: ['case', {}] },
  { slug: 'screen-protectors', name: 'Screen Protectors', nav: '', inNav: 0, home: 0, art: ['protector', {}] },
  { slug: 'others', name: 'Others', nav: '', inNav: 0, home: 0, art: ['watch', {}] },
];

const IPHONE_COLOURS = 'Natural Titanium|#8a8580\nBlack Titanium|#3b3c40\nBlue Titanium|#3e4a5c\nWhite Titanium|#e6e4df';
const STORAGE = '128GB\n256GB|+100\n512GB|+300\n1TB|+500';

const PRODUCTS: [string, string, string, number, number, number, string, unknown, string, string, string, number, number][] = [
  ['iPhone 15 Pro', 'mobile-phones', 'Apple', 699, 999, 25, 'Titanium design, A17 Pro chip and a pro camera system.', ['phone', {}],
    '6.1" Super Retina XDR display\nA17 Pro chip\nPro camera system\nUp to 1TB storage', IPHONE_COLOURS, STORAGE, 1, 124],
  ['Samsung Galaxy S24', 'mobile-phones', 'Samsung', 799, 0, 18, 'Galaxy AI is here. Epic camera, all-day battery.', ['phone', { color: '#6b5b95', accent: '#4b3f6b', cam: 'vertical' }],
    '6.2" Dynamic AMOLED 2X\nSnapdragon 8 Gen 3\n50MP triple camera\nGalaxy AI features', 'Cobalt Violet|#6b5b95\nOnyx Black|#2b2b2f\nMarble Grey|#c9c9c9', '128GB\n256GB|+60\n512GB|+180', 1, 112],
  ['Google Pixel 8', 'mobile-phones', 'Google', 599, 699, 12, 'The helpful phone engineered by Google, with the best of Google AI.', ['phone', { color: '#d8d4cc', accent: '#a6a198', cam: 'vertical' }],
    '6.2" Actua display\nGoogle Tensor G3\n50MP main camera\n7 years of OS updates', 'Hazel|#8d9488\nObsidian|#2a2a2a\nRose|#e8c8c0', '128GB\n256GB|+60', 0, 40],
  ['iPhone 15', 'mobile-phones', 'Apple', 599, 0, 30, 'Dynamic Island, 48MP main camera and USB-C.', ['phone', { color: '#f2c9cf', accent: '#d9a9b0' }],
    '6.1" Super Retina XDR\nA16 Bionic chip\n48MP main camera\nUSB-C', 'Pink|#f2c9cf\nBlue|#cfe1ea\nBlack|#35393d', '128GB\n256GB|+100\n512GB|+300', 0, 70],
  ['AirPods Pro 2', 'headphones', 'Apple', 249, 279, 40, 'Up to 2x more Active Noise Cancellation with Adaptive Audio.', ['earbuds', {}],
    'Active Noise Cancellation\nAdaptive Audio\nUSB-C MagSafe case\nUp to 6 hours listening', '', '', 1, 88],
  ['Sony WH-1000XM5', 'headphones', 'Sony', 329, 379, 15, 'Industry-leading noise cancelling wireless headphones.', ['headphones', {}],
    'Industry-leading ANC\n30-hour battery\nMultipoint connection\nCrystal clear calls', 'Black|#1b1d22\nSilver|#c0c7d6', '', 1, 64],
  ['Samsung Galaxy Buds2 Pro', 'headphones', 'Samsung', 149, 219, 22, 'Hi-Fi 24-bit audio with intelligent ANC.', ['earbuds', { color: '#2b2f38' }],
    '24-bit Hi-Fi audio\nIntelligent ANC\nIPX7 water resistant', 'Graphite|#2b2f38\nWhite|#f4f6fa', '', 0, 21],
  ['Xbox Series X', 'gaming', 'Microsoft', 449, 479, 9, 'The fastest, most powerful Xbox ever.', ['console', {}],
    '12 teraflops of power\n1TB custom SSD\nTrue 4K gaming up to 120 FPS', '', '', 1, 76],
  ['Xbox Wireless Controller', 'gaming', 'Microsoft', 54.99, 0, 35, 'Experience the modernised design of the Xbox Wireless Controller.', ['gamepad', {}],
    'Textured grip\nHybrid D-pad\nShare button\nBluetooth', 'Robot White|#f4f6fa\nCarbon Black|#1b1d22', '', 0, 33],
  ['Logitech G502 Mouse', 'gaming', 'Logitech', 49.99, 79.99, 50, 'Iconic gaming mouse with HERO 25K sensor.', ['mouse', {}],
    'HERO 25K sensor\n11 programmable buttons\nAdjustable weights\nLIGHTSYNC RGB', '', '', 1, 58],
  ['Razer Huntsman V2', 'gaming', 'Razer', 119.99, 0, 14, 'Optical gaming keyboard with near-zero input latency.', ['keyboard', { accent: '#30a46c' }],
    'Razer optical switches\n8000Hz polling rate\nDoubleshot PBT keycaps', '', '', 0, 26],
  ['Dell XPS 13 Laptop', 'laptops', 'Dell', 1099, 1299, 7, 'Stunning 13.4" InfinityEdge display in a compact design.', ['laptop', {}],
    '13.4" FHD+ InfinityEdge\nIntel Core Ultra 7\n16GB RAM\n512GB SSD', 'Platinum|#c0c7d6\nGraphite|#3a3f4a', '512GB\n1TB|+150', 1, 19],
  ['MacBook Air 13" M3', 'laptops', 'Apple', 999, 1099, 10, 'Strikingly thin and fast with the M3 chip.', ['laptop', { screen: '#7b61ff' }],
    'Apple M3 chip\n13.6" Liquid Retina\nUp to 18 hours battery\n8GB unified memory', 'Midnight|#2e3642\nStarlight|#e3dccb\nSilver|#d6d9de', '256GB\n512GB|+200', 1, 44],
  ['Lenovo IdeaPad Slim 5', 'laptops', 'Lenovo', 649, 749, 11, 'Everyday performance in a slim, light chassis.', ['laptop', { screen: '#30a46c' }],
    '14" WUXGA OLED\nAMD Ryzen 7\n16GB RAM\n512GB SSD', '', '', 0, 12],
  ['USB-C Charger 65W', 'chargers-cables', 'Anker', 34.99, 0, 80, 'Compact GaN charger for phones, tablets and laptops.', ['charger', {}],
    'GaN technology\n65W fast charging\nFoldable plug', '', '', 1, 95],
  ['USB-C to USB-C Cable 2m', 'chargers-cables', 'Anker', 14.99, 0, 120, 'Durable braided cable with 100W charging.', ['cable', {}],
    '100W power delivery\nBraided nylon\n2 metre length', 'White|#f4f6fa\nBlack|#1b1d22', '', 0, 140],
  ['Wireless Charging Pad 15W', 'chargers-cables', 'Belkin', 29.99, 39.99, 45, 'Fast Qi wireless charging for all compatible phones.', ['charger', { color: '#1b1d22' }],
    'Qi certified\n15W fast wireless\nNon-slip surface', '', '', 0, 30],
  ['iPhone 15 Pro Case', 'mobile-covers', 'Startech', 29.99, 0, 60, 'Slim protective case with MagSafe support.', ['case', {}],
    'MagSafe compatible\nRaised camera lip\nDrop protection', 'Navy|#0a2a66\nBlack|#1b1d22\nClear|#dfe8ff', '', 0, 77],
  ['Galaxy S24 Silicone Case', 'mobile-covers', 'Samsung', 24.99, 0, 40, 'Soft-touch silicone case from Samsung.', ['case', { color: '#6b5b95' }],
    'Soft-touch finish\nMicrofibre lining', 'Violet|#6b5b95\nBlack|#1b1d22', '', 0, 18],
  ['Screen Protector (2 Pack)', 'screen-protectors', 'Startech', 12.99, 19.99, 150, '9H tempered glass with easy install frame.', ['protector', {}],
    '9H tempered glass\nCase friendly\nEasy install frame\nPack of 2', '', 'iPhone 15 / 15 Pro\niPhone 15 Pro Max\nGalaxy S24', 0, 160],
  ['Apple Watch Series 9', 'others', 'Apple', 399, 429, 8, 'Smarter, brighter and mightier.', ['watch', {}],
    'S9 SiP chip\nDouble tap gesture\nAlways-on Retina display', 'Midnight|#2e3642\nStarlight|#e3dccb', '41mm\n45mm|+30', 0, 22],
  ['Samsung Galaxy Tab S9', 'others', 'Samsung', 699, 799, 6, 'Dynamic AMOLED 2X tablet with S Pen included.', ['tablet', {}],
    '11" Dynamic AMOLED 2X\nS Pen included\nIP68 water resistance', '', '128GB\n256GB|+100', 0, 9],
  ['JBL Flip 6 Speaker', 'accessories', 'JBL', 99.99, 129.99, 20, 'Bold sound for every adventure. Waterproof and dustproof.', ['speaker', {}],
    'IP67 waterproof\n12 hours playtime\nPartyBoost', 'Black|#1b1d22\nBlue|#1e63ff\nRed|#e5484d', '', 0, 35],
  ['Magnetic Car Mount', 'accessories', 'Belkin', 19.99, 0, 70, 'Secure MagSafe car vent mount.', ['charger', { color: '#2b2f38' }],
    'MagSafe compatible\nAdjustable angle\nVent clip', '', '', 0, 41],
];

const PAGES: Record<string, [string, string, string]> = {
  about: ['About Us', 'Your Trusted Tech Partner in the UK', `Startech Mobile is a UK based electronics store, offering the latest mobile phones, accessories, gaming gear, laptops and expert repair services.

We are committed to providing genuine products, competitive prices and excellent customer service — online and in store.

Our certified technicians repair phones, tablets, laptops and consoles every day, using quality parts and backed by our repair warranty.`],
  'about-why': ['Why Choose Us?', '', `- Wide range of top brands
- Competitive prices
- Fast & reliable delivery
- Professional repair services
- Dedicated customer support`],
  terms: ['Terms & Conditions', 'Last updated: October 2026', `## 1. Introduction
These terms apply to all purchases and repair bookings made with Startech Mobile. By placing an order you agree to these terms.

## 2. Orders and Payment
All prices are shown in euros (EUR) and include VAT. An order is accepted when we confirm it by email. We reserve the right to cancel orders where stock is unavailable or pricing errors have occurred.

## 3. Delivery
We deliver across the UK. Estimated delivery times are shown at checkout and are not guaranteed.

## 4. Returns and Refunds
You may return most items within 14 days of delivery. See our Returns & Refunds policy for full details.

## 5. Repairs
Repair quotes are provided after inspection. Repairs carry a 90-day warranty on parts and labour.

## 6. Liability
Nothing in these terms limits your statutory rights as a consumer.`],
  privacy: ['Privacy Policy', 'How we look after your personal data', `## 1. What We Collect
We collect the information you give us when you create an account, place an order, book a repair or contact us — such as your name, email, phone number and delivery address.

## 2. How We Use Your Information
- To process and deliver your orders
- To manage your repair bookings
- To respond to your enquiries
- To meet our legal obligations

## 3. Data Security
Passwords are stored using strong one-way hashing. Your data is never sold to third parties.

## 4. Your Rights
Under UK GDPR you can request access to, correction of, or deletion of your personal data at any time by contacting us.`],
  returns: ['Returns & Refunds', '14-day hassle-free returns', `## Returning an item
You can return most products within **14 days** of delivery for a full refund, provided they are unused and in their original packaging.

## How to return
- Contact us with your order number
- Pack the item securely
- We will send you a returns label

## Refunds
Refunds are issued to your original payment method within 5 working days of us receiving the item.

## Faulty items
If your item is faulty, contact us and we will repair, replace or refund it in line with your statutory rights.`],
  delivery: ['Delivery Information', 'Fast UK delivery', `## Standard delivery
Free on orders over €59.93. Otherwise a small delivery charge applies, shown at checkout.

## Delivery times
Orders placed before 2pm Monday to Friday are usually dispatched the same day and delivered within 1-3 working days.

## Click & collect
You can also collect your order from our London store.`],
  faqs: ['FAQs', 'Frequently asked questions', `## Are your products genuine?
Yes. Every product we sell is brand new and genuine, unless clearly stated otherwise.

## How long does a screen repair take?
Most phone screen repairs are completed the same day, often within an hour.

## Can I track my order?
Yes — sign in to your account or use the Track Order page with your order number and email.

## Do you offer a warranty on repairs?
All repairs come with a 90-day warranty on parts and labour.`],
};

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function seedCatalog({ run, tx }: Db) {
  tx(() => {
    const catIds: Record<string, number> = {};
    CATEGORIES.forEach((c, i) => {
      const r = run(`INSERT INTO categories (name, slug, image, sort_order, show_in_nav, show_on_home, nav_label) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        c.name, c.slug, `/img/products/cat-${c.slug}.svg`, i, c.inNav, c.home, c.nav);
      catIds[c.slug] = r.lastInsertRowid;
    });
    for (const [name, cat, brand, price, compare, stock, short, , features, colours, options, featured, sold] of PRODUCTS) {
      const slug = slugOf(name);
      const specs = [`Brand: ${brand}`, ...features.split('\n').slice(0, 3).map((f, i) => `${['Highlight', 'Feature', 'Extra'][i]}: ${f}`), 'Warranty: 1 year manufacturer'].join('\n');
      const description = `${short}\n\nThe ${name} is available now from Startech Mobile with fast UK delivery, 14-day returns and expert after-sales support.`;
      const r = run(`INSERT INTO products (name, slug, category_id, brand, price_pence, compare_pence, stock, short_desc, description,
                       features, specs, colours, options, is_featured, sold_count)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        name, slug, catIds[cat], brand, Math.round(price * 100), Math.round(compare * 100), stock, short, description,
        features, specs, colours, options, featured, sold);
      const file = `/img/products/${slug}.svg`;
      run('INSERT INTO product_images (product_id, path, thumb, sort_order) VALUES (?, ?, ?, 0)', r.lastInsertRowid, file, file);
    }
  });
}

function seedAdmin({ get, run }: Db) {
  if (get("SELECT 1 AS x FROM users WHERE role = 'admin'")) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@startechmobile.co.uk').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  run(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
       ON CONFLICT(email) DO UPDATE SET role = 'admin'`, 'Administrator', email, hashPasswordSync(password));
  console.log('\n================ ADMIN ACCOUNT CREATED ================');
  console.log('  Admin panel: /admin');
  console.log(`  Email:       ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`  Password:    ${password}   <- save this now, it is not shown again`);
  console.log('  Change it after signing in (Admin -> Change password).');
  console.log('=======================================================\n');
}

export function seed(db: Db, { createAdmin = true } = {}) {
  if (!db.get('SELECT 1 AS x FROM categories LIMIT 1') && !db.get('SELECT 1 AS x FROM products LIMIT 1')) seedCatalog(db);
  for (const [slug, [title, subtitle, body]] of Object.entries(PAGES)) {
    db.run('INSERT OR IGNORE INTO pages (slug, title, subtitle, body) VALUES (?, ?, ?, ?)', slug, title, subtitle, body);
  }
  applyContent(db);
  if (createAdmin) seedAdmin(db);
}

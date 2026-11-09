'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { get, all, run, tx } from '@/lib/db';
import * as store from '@/lib/store';
import { requireAdmin } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { startUserSession, endSession, flash, revokeUserSessions } from '@/lib/session';
import { rateLimit } from '@/lib/ratelimit';
import { saveImage, removeUpload, filesFrom, ImageError } from '@/lib/images';
import { str, int, bool, isEmail, isDate, oneOf, checker, fields } from '@/lib/validate';
import { toPence, slugify, safeRedirectPath } from '@/lib/helpers';
import type { BlogPost, FormState, Order, ProductImage, Category } from '@/lib/types';

/*
 * Every action here starts with requireAdmin(): Server Actions are public HTTP endpoints, so the
 * admin layout's check alone is not enough. Next.js also rejects cross-origin action calls (CSRF).
 */

const ORDER_STATUSES = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const;
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
const REPAIR_STATUSES = ['new', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

/* ---------- Auth ---------- */

export async function adminLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData.get('email'), 254).toLowerCase();
  const limited = await rateLimit('login', `admin:${email}`);
  if (limited) return { errors: [limited] };
  const user = isEmail(email)
    ? get<{ id: number; password_hash: string; role: string; is_active: number }>(
        'SELECT id, password_hash, role, is_active FROM users WHERE email = ?', email)
    : undefined;
  const ok = await verifyPassword(formData.get('password'), user?.password_hash);
  if (!user || !ok || user.role !== 'admin' || !user.is_active) return { errors: ['Invalid credentials.'] };
  await startUserSession(user.id);
  const next = safeRedirectPath(formData.get('next'), '/admin');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function adminLogout(): Promise<void> {
  await endSession();
  redirect('/admin/login');
}

/* ---------- Products ---------- */

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(formData.get('id'), { min: 0, fallback: 0 });
  const existing = id ? get<{ id: number }>('SELECT id FROM products WHERE id = ?', id) : undefined;
  if (id && !existing) return { errors: ['Product not found.'] };

  const name = str(formData.get('name'), 150);
  const form = {
    name,
    slug: slugify(str(formData.get('slug'), 100) || name),
    category_id: int(formData.get('category_id'), { min: 0, fallback: 0 }) || null,
    brand: str(formData.get('brand'), 60),
    short_desc: str(formData.get('short_desc'), 300),
    description: str(formData.get('description'), 10000),
    features: str(formData.get('features'), 3000),
    specs: str(formData.get('specs'), 5000),
    colours: str(formData.get('colours'), 2000),
    options: str(formData.get('options'), 2000),
    name_pt: str(formData.get('name_pt'), 150),
    short_desc_pt: str(formData.get('short_desc_pt'), 300),
    description_pt: str(formData.get('description_pt'), 10000),
    features_pt: str(formData.get('features_pt'), 3000),
    specs_pt: str(formData.get('specs_pt'), 5000),
    is_featured: bool(formData.get('is_featured')),
    is_active: bool(formData.get('is_active')),
  };
  const price = toPence(formData.get('price'));
  const compareRaw = str(formData.get('compare'), 20);
  const compare = compareRaw ? toPence(compareRaw) : 0;
  const stock = int(formData.get('stock'), { min: -1, max: 1_000_000, fallback: -1 });
  const v = checker()
    .require(form.name.length >= 2, 'Name is required.')
    .require(price !== null, 'Enter a valid price, e.g. 699.00')
    .require(compare !== null, 'Enter a valid "was" price or leave it blank.')
    .require(stock >= 0, 'Stock must be 0 or more.');
  if (get('SELECT 1 AS x FROM products WHERE slug = ? AND id != ?', form.slug, id)) v.errors.push('That URL slug is already used by another product.');
  if (!v.ok) return { errors: v.errors };

  let productId = id;
  if (existing) {
    run(`UPDATE products SET name = ?, slug = ?, category_id = ?, brand = ?, price_pence = ?, compare_pence = ?, stock = ?,
           short_desc = ?, description = ?, features = ?, specs = ?, colours = ?, options = ?, is_featured = ?, is_active = ?,
           name_pt = ?, short_desc_pt = ?, description_pt = ?, features_pt = ?, specs_pt = ?,
           updated_at = datetime('now') WHERE id = ?`,
      form.name, form.slug, form.category_id, form.brand, price, compare, stock, form.short_desc, form.description,
      form.features, form.specs, form.colours, form.options, form.is_featured, form.is_active,
      form.name_pt, form.short_desc_pt, form.description_pt, form.features_pt, form.specs_pt, id);

    // Remove ticked images, then set the chosen main image.
    for (const raw of formData.getAll('remove_image')) {
      const img = get<ProductImage>('SELECT * FROM product_images WHERE id = ? AND product_id = ?', int(raw), id);
      if (img) {
        run('DELETE FROM product_images WHERE id = ?', img.id);
        removeUpload(img.path);
        removeUpload(img.thumb);
      }
    }
    const main = int(formData.get('main_image'));
    if (main && get('SELECT 1 AS x FROM product_images WHERE id = ? AND product_id = ?', main, id)) {
      tx(() => {
        run('UPDATE product_images SET sort_order = sort_order + 1 WHERE product_id = ?', id);
        run('UPDATE product_images SET sort_order = 0 WHERE id = ?', main);
      });
    }
  } else {
    productId = run(`INSERT INTO products (name, slug, category_id, brand, price_pence, compare_pence, stock, short_desc, description,
                       features, specs, colours, options, is_featured, is_active, name_pt, short_desc_pt, description_pt, features_pt, specs_pt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      form.name, form.slug, form.category_id, form.brand, price, compare, stock, form.short_desc, form.description,
      form.features, form.specs, form.colours, form.options, form.is_featured, form.is_active,
      form.name_pt, form.short_desc_pt, form.description_pt, form.features_pt, form.specs_pt).lastInsertRowid;
  }

  let imageError: string | null = null;
  let order = get<{ m: number }>('SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?', productId)?.m ?? -1;
  for (const file of filesFrom(formData, 'images').slice(0, 10)) {
    try {
      const saved = await saveImage(file);
      run('INSERT INTO product_images (product_id, path, thumb, sort_order) VALUES (?, ?, ?, ?)', productId, saved.path, saved.thumb, ++order);
    } catch (err) {
      if (!(err instanceof ImageError)) throw err;
      imageError = err.message;
    }
  }
  store.invalidate();
  await flash(imageError ? 'error' : 'success', imageError ? `Product saved, but an image was skipped: ${imageError}` : existing ? 'Product updated.' : 'Product created.');
  redirect(`/admin/products/${productId}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = int(formData.get('id'));
  const images = all<ProductImage>('SELECT * FROM product_images WHERE product_id = ?', id);
  run('DELETE FROM products WHERE id = ?', id);
  for (const img of images) { removeUpload(img.path); removeUpload(img.thumb); }
  store.invalidate();
  await flash('success', 'Product deleted.');
  redirect('/admin/products');
}

/* ---------- Categories ---------- */

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(formData.get('id'), { min: 0, fallback: 0 });
  const existing = id ? get<Category>('SELECT * FROM categories WHERE id = ?', id) : undefined;
  const name = str(formData.get('name'), 80);
  const slug = slugify(str(formData.get('slug'), 80) || name);
  const errors: string[] = [];
  if (name.length < 2) errors.push('Category name is required.');
  if (get('SELECT 1 AS x FROM categories WHERE slug = ? AND id != ?', slug, id)) errors.push('That slug is already in use.');
  if (errors.length) return { errors };

  let image = existing?.image ?? '';
  const [file] = filesFrom(formData, 'image');
  if (file) {
    try {
      const saved = await saveImage(file, { width: 600, thumbWidth: 300 });
      removeUpload(saved.path);
      if (existing) removeUpload(existing.image);
      image = saved.thumb;
    } catch (err) {
      if (err instanceof ImageError) return { errors: [err.message] };
      throw err;
    }
  }
  const values = [name, slug, str(formData.get('nav_label'), 40), int(formData.get('sort_order'), { min: 0, max: 9999 }),
    bool(formData.get('show_in_nav')), bool(formData.get('show_on_home')), image,
    str(formData.get('name_pt'), 80), str(formData.get('nav_label_pt'), 40)] as const;
  if (existing) {
    run('UPDATE categories SET name = ?, slug = ?, nav_label = ?, sort_order = ?, show_in_nav = ?, show_on_home = ?, image = ?, name_pt = ?, nav_label_pt = ? WHERE id = ?',
      ...values, existing.id);
  } else {
    run('INSERT INTO categories (name, slug, nav_label, sort_order, show_in_nav, show_on_home, image, name_pt, nav_label_pt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ...values);
  }
  store.invalidate();
  await flash('success', existing ? 'Category updated.' : 'Category added.');
  redirect('/admin/categories');
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const cat = get<Category>('SELECT * FROM categories WHERE id = ?', int(formData.get('id')));
  if (cat) {
    run('DELETE FROM categories WHERE id = ?', cat.id);
    removeUpload(cat.image);
    store.invalidate();
    await flash('success', 'Category deleted. Its products are now uncategorised.');
  }
  redirect('/admin/categories');
}

/* ---------- Orders ---------- */

export async function updateOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const order = get<Order>('SELECT * FROM orders WHERE id = ?', int(formData.get('id')));
  if (!order) return { errors: ['Order not found.'] };
  const status = oneOf(formData.get('status'), ORDER_STATUSES, order.status);
  const payment = oneOf(formData.get('payment_status'), PAYMENT_STATUSES, order.payment_status);
  const tracking = str(formData.get('tracking_number'), 60);

  tx(() => {
    // Return stock when an order is cancelled (and take it again if it is un-cancelled).
    if (status !== order.status && (status === 'cancelled' || order.status === 'cancelled')) {
      const sign = status === 'cancelled' ? 1 : -1;
      for (const it of all<{ product_id: number; qty: number }>(
        'SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', order.id)) {
        run('UPDATE products SET stock = MAX(0, stock + ?), sold_count = MAX(0, sold_count - ?) WHERE id = ?',
          sign * it.qty, sign * it.qty, it.product_id);
      }
    }
    run(`UPDATE orders SET status = ?, payment_status = ?, tracking_number = ?, updated_at = datetime('now') WHERE id = ?`,
      status, payment, tracking, order.id);
  });
  store.invalidate();
  refresh();
  return { ok: true, message: 'Order updated.', at: Date.now() };
}

/* ---------- Repairs ---------- */

export async function updateRepair(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const repair = get<{ id: number; status: (typeof REPAIR_STATUSES)[number]; quote_pence: number }>(
    'SELECT id, status, quote_pence FROM repairs WHERE id = ?', int(formData.get('id')));
  if (!repair) return { errors: ['Repair not found.'] };
  const quoteRaw = str(formData.get('quote'), 20);
  const quote = quoteRaw ? toPence(quoteRaw) : 0;
  if (quote === null) return { errors: ['Enter a valid quote, e.g. 89.00'] };
  run('UPDATE repairs SET status = ?, admin_notes = ?, quote_pence = ? WHERE id = ?',
    oneOf(formData.get('status'), REPAIR_STATUSES, repair.status), str(formData.get('admin_notes'), 3000), quote, repair.id);
  refresh();
  return { ok: true, message: 'Repair updated.', at: Date.now() };
}

export async function deleteRepair(formData: FormData): Promise<void> {
  await requireAdmin();
  run('DELETE FROM repairs WHERE id = ?', int(formData.get('id')));
  await flash('success', 'Repair booking deleted.');
  redirect('/admin/repairs');
}

/* ---------- Messages, reviews, customers ---------- */

export async function deleteMessage(formData: FormData): Promise<void> {
  await requireAdmin();
  run('DELETE FROM messages WHERE id = ?', int(formData.get('id')));
  await flash('success', 'Message deleted.');
  redirect('/admin/messages');
}

export async function approveReview(formData: FormData): Promise<void> {
  await requireAdmin();
  run('UPDATE reviews SET is_approved = 1 WHERE id = ?', int(formData.get('id')));
  refresh();
}

export async function deleteReview(formData: FormData): Promise<void> {
  await requireAdmin();
  run('DELETE FROM reviews WHERE id = ?', int(formData.get('id')));
  refresh();
}

export async function toggleCustomer(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = int(formData.get('id'));
  if (id === admin.id) {
    await flash('error', "You can't disable your own account.");
  } else {
    run('UPDATE users SET is_active = 1 - is_active WHERE id = ?', id);
    await revokeUserSessions(id, false);
    await flash('success', 'Account status updated.');
  }
  refresh();
}

/* ---------- Pages & settings ---------- */

export async function savePage(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const slug = str(formData.get('slug'), 40);
  const page = get<{ title: string }>('SELECT title FROM pages WHERE slug = ?', slug);
  if (!page) return { errors: ['Page not found.'] };
  run(`UPDATE pages SET title = ?, subtitle = ?, body = ?, title_pt = ?, subtitle_pt = ?, body_pt = ?, updated_at = datetime('now') WHERE slug = ?`,
    str(formData.get('title'), 120) || page.title, str(formData.get('subtitle'), 300), str(formData.get('body'), 50000),
    str(formData.get('title_pt'), 120), str(formData.get('subtitle_pt'), 300), str(formData.get('body_pt'), 50000), slug);
  refresh();
  return { ok: true, message: 'Page saved.', at: Date.now() };
}

/* ---------- Blog ---------- */

export async function saveBlogPost(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(formData.get('id'), { min: 0, fallback: 0 });
  const existing = id ? get<BlogPost>('SELECT * FROM blog_posts WHERE id = ?', id) : undefined;
  if (id && !existing) return { errors: ['Article not found.'] };

  const form = fields(formData, {
    title: 160, title_pt: 160, excerpt: 300, excerpt_pt: 300, category: 40, category_pt: 40,
    body: 50000, body_pt: 50000, cta_href: 300, cta_label: 60, cta_label_pt: 60,
  });
  const slug = slugify(str(formData.get('slug'), 100) || form.title);
  const published = str(formData.get('published'), 10);
  const [file] = filesFrom(formData, 'image');
  const v = checker()
    .require(form.title.length >= 2, 'Title is required.')
    .require(form.category, 'Category is required.')
    .require(form.excerpt, 'Summary is required.')
    .require(form.body, 'Article text is required.')
    .require(isDate(published), 'Enter a valid publication date.')
    .require(file || existing, 'Please add a cover image.')
    .require(safeLink(form.cta_href), 'Button link must be a page path like /repairs or an https:// URL.')
    .require(!form.cta_href === !form.cta_label, 'Fill in both the button text and its link, or leave both blank.');
  if (get('SELECT 1 AS x FROM blog_posts WHERE slug = ? AND id != ?', slug, id)) v.errors.push('That URL slug is already used by another article.');
  if (!v.ok) return { errors: v.errors };

  // Saved last, so a rejected form never leaves an unused file behind.
  let saved: { path: string; thumb: string } | undefined;
  if (file) {
    try {
      saved = await saveImage(file, { width: 1600, thumbWidth: 800 });
    } catch (err) {
      if (err instanceof ImageError) return { errors: [err.message] };
      throw err;
    }
  }
  const values = [slug, published, saved?.path ?? existing!.image, saved?.thumb ?? existing!.thumb, form.category, form.category_pt, form.title, form.title_pt,
    form.excerpt, form.excerpt_pt, form.body, form.body_pt, form.cta_href, form.cta_label, form.cta_label_pt, bool(formData.get('is_active'))] as const;

  let postId = id;
  if (existing) {
    run(`UPDATE blog_posts SET slug = ?, published = ?, image = ?, thumb = ?, category = ?, category_pt = ?, title = ?, title_pt = ?,
           excerpt = ?, excerpt_pt = ?, body = ?, body_pt = ?, cta_href = ?, cta_label = ?, cta_label_pt = ?, is_active = ?,
           updated_at = datetime('now') WHERE id = ?`, ...values, id);
    if (saved) { removeUpload(existing.image); removeUpload(existing.thumb); }
  } else {
    postId = run(`INSERT INTO blog_posts (slug, published, image, thumb, category, category_pt, title, title_pt, excerpt, excerpt_pt, body, body_pt, cta_href, cta_label, cta_label_pt, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ...values).lastInsertRowid;
  }
  await flash('success', existing ? 'Article updated.' : 'Article created.');
  redirect(`/admin/blog/${postId}`);
}

export async function deleteBlogPost(formData: FormData): Promise<void> {
  await requireAdmin();
  const post = get<BlogPost>('SELECT * FROM blog_posts WHERE id = ?', int(formData.get('id')));
  if (post) {
    run('DELETE FROM blog_posts WHERE id = ?', post.id);
    removeUpload(post.image);
    removeUpload(post.thumb);
    await flash('success', 'Article deleted.');
  }
  redirect('/admin/blog');
}

const URL_KEYS = ['social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube'] as const;
// Links rendered into href must be https:// or a site-relative path, never javascript: etc.
const safeUrl = (v: string) => v === '' || /^https:\/\/[^\s"'<>]+$/i.test(v);
const safeLink = (v: string) => /^\/(?!\/)[^\s"'<>]*$/.test(v) || safeUrl(v);

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values: Partial<Record<store.SettingKey, string>> = {};
  const errors: string[] = [];
  for (const key of Object.keys(store.DEFAULTS) as store.SettingKey[]) {
    if (key === 'hero_image' || key === 'free_delivery_pence' || key === 'delivery_fee_pence') continue;
    if (formData.has(key)) values[key] = str(formData.get(key), 5000);
  }
  for (const key of URL_KEYS) {
    if (values[key] !== undefined && !safeUrl(values[key]!)) errors.push(`${key.replace('social_', '')} link must start with https://`);
  }
  if (values.hero_button_link !== undefined && !safeLink(values.hero_button_link)) {
    errors.push('Hero button link must be a page path like /shop or an https:// URL.');
  }
  if (values.email && !isEmail(values.email)) errors.push('Contact email is not valid.');
  for (const [field, key] of [['free_delivery', 'free_delivery_pence'], ['delivery_fee', 'delivery_fee_pence']] as const) {
    if (formData.has(field)) {
      const raw = str(formData.get(field), 20);
      const p = toPence(raw === '' ? '0' : raw);
      if (p === null) errors.push('Delivery amounts must be valid prices.');
      else values[key] = String(p);
    }
  }
  if (errors.length) return { errors };

  const [file] = filesFrom(formData, 'hero_image_file');
  const current = store.settings().hero_image;
  if (file) {
    try {
      const saved = await saveImage(file, { width: 1400, thumbWidth: 700 });
      removeUpload(current);
      removeUpload(current.replace('.webp', '-t.webp'));
      values.hero_image = saved.path;
    } catch (err) {
      if (err instanceof ImageError) return { errors: [err.message] };
      throw err;
    }
  } else if (formData.get('reset_hero') === 'on') {
    values.hero_image = store.DEFAULTS.hero_image;
  }

  store.saveSettings(values);
  refresh();
  return { ok: true, message: 'Settings saved.', at: Date.now() };
}

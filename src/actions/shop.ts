'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { get, run, tx } from '@/lib/db';
import * as cart from '@/lib/cart';
import { settings, invalidate } from '@/lib/store';
import { flash, readSession, updateSession } from '@/lib/session';
import { currentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { str, int, isEmail, isPhone, isPostcode, checker, fields } from '@/lib/validate';
import { lines, money, randomRef, safeRedirectPath } from '@/lib/helpers';
import { pick } from '@/lib/i18n/config';
import { getI18n } from '@/lib/i18n/server';
import type { FormState } from '@/lib/types';

/* ---------- Cart ---------- */

export async function addToCart(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, locale } = await getI18n();
  const limited = await rateLimit('cart');
  if (limited) return { errors: [limited], at: Date.now() };

  const id = int(formData.get('productId'), { min: 1, fallback: 0 });
  const product = id
    ? get<{ id: number; name: string; name_pt: string; stock: number; colours: string; options: string }>(
        'SELECT id, name, name_pt, stock, colours, options FROM products WHERE id = ? AND is_active = 1', id)
    : undefined;
  if (!product) return { errors: [t('msg.productGone')], at: Date.now() };
  if (product.stock <= 0) return { errors: [t('msg.outOfStock')], at: Date.now() };

  const data = await updateSession((s) =>
    cart.add(s, product, {
      colour: str(formData.get('colour'), 60),
      option: str(formData.get('option'), 60),
      qty: int(formData.get('qty'), { min: 1, max: cart.MAX_QTY, fallback: 1 }),
    }),
  );
  if (formData.get('buyNow')) redirect('/cart');
  refresh(); // re-render the header cart badge
  const s = cart.summary(data);
  return { ok: true, message: t('msg.addedToBasket', { name: pick(product, 'name', locale) }), at: Date.now(), data: { count: s.count, total: money(s.total, locale) } };
}

export async function updateCartLine(formData: FormData): Promise<void> {
  const index = int(formData.get('index'), { min: 0, max: 100, fallback: -1 });
  const qty = formData.get('remove') ? 0 : int(formData.get('qty'), { min: 0, max: cart.MAX_QTY, fallback: 1 });
  await updateSession((s) => cart.update(s, index, qty));
  refresh();
}

/* ---------- Checkout ---------- */

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, locale } = await getI18n();
  const session = await readSession();
  const summary = cart.summary(session?.data);
  if (!summary.lines.length) redirect('/cart');

  const limited = await rateLimit('checkout');
  if (limited) return { errors: [limited] };

  const methods = lines(settings().payment_methods);
  const form = fields(formData, {
    email: 254, full_name: 100, phone: 20, line1: 120, line2: 120, city: 60, postcode: 10, notes: 500, payment_method: 120,
  });
  form.email = form.email.toLowerCase();
  form.postcode = form.postcode.toUpperCase();
  const v = checker()
    .require(isEmail(form.email), t('v.email'))
    .require(form.full_name.length >= 2, t('v.fullName'))
    .require(isPhone(form.phone), t('v.phone'))
    .require(form.line1.length >= 3, t('v.address'))
    .require(form.city.length >= 2, t('v.city'))
    .require(isPostcode(form.postcode), t('v.postcode'))
    .require(methods.includes(form.payment_method), t('v.paymentMethod'))
    .require(formData.get('agree') === 'on', t('v.terms'));
  if (!v.ok) return { errors: v.errors };

  const user = await currentUser();
  let orderNumber: string;
  try {
    // Prices come from the database (via cart.summary); stock is checked and taken atomically.
    orderNumber = tx(() => {
      for (const l of summary.lines) {
        const r = run('UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ? AND stock >= ?',
          l.qty, l.qty, l.product.id, l.qty);
        if (r.changes !== 1) throw new StockError(t('msg.notEnoughStock', { name: pick(l.product, 'name', locale) }));
      }
      const number = randomRef('SM');
      const o = run(`INSERT INTO orders (order_number, user_id, email, full_name, phone, line1, line2, city, postcode, notes,
                       subtotal_pence, delivery_pence, total_pence, payment_method)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        number, user?.id ?? null, form.email, form.full_name, form.phone, form.line1, form.line2,
        form.city, form.postcode, form.notes, summary.subtotal, summary.delivery, summary.total, form.payment_method);
      for (const l of summary.lines) {
        run(`INSERT INTO order_items (order_id, product_id, name, variant, image, price_pence, qty) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          o.lastInsertRowid, l.product.id, l.product.name, l.variant, l.product.thumb || '', l.unit, l.qty);
      }
      return number;
    });
  } catch (err) {
    if (err instanceof StockError) return { errors: [err.message] };
    throw err;
  }

  invalidate();
  await updateSession((s) => {
    cart.clear(s);
    s.recentOrders = [...(s.recentOrders || []), orderNumber].slice(-5);
  });
  redirect(`/order/${orderNumber}`);
}

class StockError extends Error {}

/* ---------- Reviews & wishlist ---------- */

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const user = await currentUser();
  if (!user) return { errors: [t('msg.signInToReview')] };
  const limited = await rateLimit('forms');
  if (limited) return { errors: [limited] };

  const product = get<{ id: number; slug: string }>('SELECT id, slug FROM products WHERE id = ? AND is_active = 1',
    int(formData.get('productId')));
  if (!product) return { errors: [t('msg.productNotFound')] };
  const rating = int(formData.get('rating'), { min: 0, max: 5 });
  const body = str(formData.get('body'), 2000);
  if (rating < 1 || body.length < 10) return { errors: [t('msg.reviewInvalid')] };
  if (get('SELECT 1 AS x FROM reviews WHERE product_id = ? AND user_id = ?', product.id, user.id)) {
    return { errors: [t('msg.reviewDuplicate')] };
  }
  run('INSERT INTO reviews (product_id, user_id, author, rating, body) VALUES (?, ?, ?, ?, ?)',
    product.id, user.id, user.name.split(' ')[0], rating, body);
  return { ok: true, message: t('msg.reviewThanks') };
}

export async function toggleWishlist(formData: FormData): Promise<void> {
  const { t } = await getI18n();
  const back = safeRedirectPath(formData.get('back'), '/account/wishlist');
  const user = await currentUser();
  if (!user) {
    await flash('info', t('msg.signInToSave'));
    redirect('/account/login?next=' + encodeURIComponent(back));
  }
  const productId = int(formData.get('productId'), { min: 1, fallback: 0 });
  const exists = get('SELECT 1 AS x FROM wishlist WHERE user_id = ? AND product_id = ?', user.id, productId);
  if (exists) run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', user.id, productId);
  else if (get('SELECT 1 AS x FROM products WHERE id = ? AND is_active = 1', productId)) {
    run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', user.id, productId);
  }
  await flash('success', exists ? t('msg.wishlistRemoved') : t('msg.wishlistAdded'));
  refresh();
}

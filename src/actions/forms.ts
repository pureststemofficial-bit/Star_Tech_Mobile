'use server';

import { redirect } from 'next/navigation';
import { get, all, run } from '@/lib/db';
import { paymentLabel, settings } from '@/lib/store';
import { flash } from '@/lib/session';
import { currentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { str, isEmail, isPhone, isDate, checker, fields } from '@/lib/validate';
import { lines, randomRef } from '@/lib/helpers';
import { getI18n } from '@/lib/i18n/server';
import type { FormState, Order, OrderItem } from '@/lib/types';

export async function sendMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getI18n();
  // Honeypot field: real visitors never see or fill it.
  if (formData.get('website')) return { ok: true, message: t('msg.messageThanks') };
  const limited = await rateLimit('forms');
  if (limited) return { errors: [limited] };

  const form = fields(formData, { name: 100, email: 254, phone: 20, message: 3000 });
  const v = checker()
    .require(form.name.length >= 2, t('v.name'))
    .require(isEmail(form.email), t('v.email'))
    .require(!form.phone || isPhone(form.phone), t('v.phone'))
    .require(form.message.length >= 10, t('v.message'));
  if (!v.ok) return { errors: v.errors };

  run('INSERT INTO messages (name, email, phone, body) VALUES (?, ?, ?, ?)', form.name, form.email, form.phone, form.message);
  await flash('success', t('msg.messageThanks'));
  redirect('/contact');
}

export async function bookRepair(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get('website')) return { ok: true };
  const { t } = await getI18n();
  const limited = await rateLimit('forms');
  if (limited) return { errors: [limited] };

  const s = settings();
  const opts = {
    deviceTypes: lines(s.repair_device_types), brands: lines(s.repair_brands),
    repairTypes: lines(s.repair_types), times: lines(s.repair_times),
  };
  const form = fields(formData, {
    device_type: 60, brand: 60, model: 80, repair_type: 60, full_name: 100, phone: 20, email: 254,
    preferred_date: 10, preferred_time: 30, details: 2000,
  });
  form.email = form.email.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const v = checker()
    .require(opts.deviceTypes.includes(form.device_type), t('v.device'))
    .require(opts.brands.includes(form.brand), t('v.brand'))
    .require(form.model.length >= 1, t('v.model'))
    .require(opts.repairTypes.includes(form.repair_type), t('v.repairType'))
    .require(form.full_name.length >= 2, t('v.fullName'))
    .require(isPhone(form.phone), t('v.phone'))
    .require(isEmail(form.email), t('v.email'))
    .require(isDate(form.preferred_date) && form.preferred_date >= today, t('v.date'))
    .require(opts.times.includes(form.preferred_time), t('v.time'));
  if (!v.ok) return { errors: v.errors };

  const user = await currentUser();
  const ref = randomRef('RP');
  run(`INSERT INTO repairs (ref, user_id, device_type, brand, model, repair_type, full_name, phone, email,
         preferred_date, preferred_time, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ref, user?.id ?? null, form.device_type, form.brand, form.model, form.repair_type,
    form.full_name, form.phone, form.email, form.preferred_date, form.preferred_time, form.details);
  await flash('success', t('msg.repairBooked', { ref }));
  redirect('/repairs');
}

/** Guest order tracking: needs both the order number and the email used at checkout. */
export async function trackOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t, locale } = await getI18n();
  const limited = await rateLimit('forms');
  if (limited) return { errors: [limited] };
  const number = str(formData.get('number'), 30).toUpperCase();
  const email = str(formData.get('email'), 254).toLowerCase();
  const order = get<Order>('SELECT * FROM orders WHERE order_number = ? AND email = ?', number, email);
  if (!order) return { errors: [t('msg.orderNotFound')] };
  const items = all<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', order.id);
  return { ok: true, data: { order, items, paymentLabel: paymentLabel(order.payment_method, locale) } };
}

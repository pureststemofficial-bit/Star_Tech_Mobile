'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { get, run } from '@/lib/db';
import { hashPassword, verifyPassword, passwordProblem } from '@/lib/password';
import { startUserSession, endSession, flash, revokeUserSessions } from '@/lib/session';
import { currentUser, requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { str, int, isEmail, isPhone, isPostcode, checker, fields } from '@/lib/validate';
import { safeRedirectPath } from '@/lib/helpers';
import { settings } from '@/lib/store';
import type { Translator } from '@/lib/i18n/server';
import { getI18n } from '@/lib/i18n/server';
import type { FormState } from '@/lib/types';

const pwMessages = (t: Translator) => ({ short: t('v.pwShort'), long: t('v.pwLong'), mix: t('v.pwMix') });

/* ---------- Sign in / register ---------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const email = str(formData.get('email'), 254).toLowerCase();
  const next = safeRedirectPath(formData.get('next'), '/account');
  const limited = await rateLimit('login', email);
  if (limited) return { errors: [limited] };

  const user = isEmail(email)
    ? get<{ id: number; password_hash: string; is_active: number }>('SELECT id, password_hash, is_active FROM users WHERE email = ?', email)
    : undefined;
  const ok = await verifyPassword(formData.get('password'), user?.password_hash);
  if (!user || !ok || !user.is_active) return { errors: [t('msg.wrongLogin')] };

  await startUserSession(user.id);
  redirect(next.startsWith('/admin') ? '/account' : next);
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const limited = await rateLimit('register');
  if (limited) return { errors: [limited] };

  const form = fields(formData, { name: 100, email: 254, phone: 20 });
  form.email = form.email.toLowerCase();
  const password = String(formData.get('password') ?? '');
  const pwProblem = passwordProblem(password, pwMessages(t));
  const v = checker()
    .require(form.name.length >= 2, t('v.name'))
    .require(isEmail(form.email), t('v.email'))
    .require(!form.phone || isPhone(form.phone), t('v.phone'))
    .require(!pwProblem, pwProblem ?? '')
    .require(password === formData.get('password_confirm'), t('msg.passwordsDiffer'));
  if (v.ok && get('SELECT 1 AS x FROM users WHERE email = ?', form.email)) {
    v.errors.push(t('msg.emailExists'));
  }
  if (!v.ok) return { errors: v.errors };

  const r = run('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
    form.name, form.email, form.phone, await hashPassword(password));
  // Link any guest orders placed with this email address.
  run('UPDATE orders SET user_id = ? WHERE user_id IS NULL AND email = ?', r.lastInsertRowid, form.email);
  await startUserSession(r.lastInsertRowid);
  await flash('success', t('msg.welcome', { site: settings().site_name }));
  redirect('/account');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/');
}

/* ---------- Addresses ---------- */

export async function addAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const form = fields(formData, { full_name: 100, line1: 120, line2: 120, city: 60, postcode: 10, phone: 20 });
  form.postcode = form.postcode.toUpperCase();
  const count = get<{ n: number }>('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', user.id)?.n ?? 0;
  const v = checker()
    .require(form.full_name.length >= 2, t('v.fullName'))
    .require(form.line1.length >= 3, t('v.address'))
    .require(form.city.length >= 2, t('v.city'))
    .require(isPostcode(form.postcode), t('v.postcode'))
    .require(!form.phone || isPhone(form.phone), t('v.phone'))
    .require(count < 10, t('msg.maxAddresses'));
  if (!v.ok) return { errors: v.errors };
  run(`INSERT INTO addresses (user_id, full_name, line1, line2, city, postcode, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id, form.full_name, form.line1, form.line2, form.city, form.postcode, form.phone, count === 0 ? 1 : 0);
  await flash('success', t('msg.addressSaved'));
  redirect('/account/addresses');
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const user = await requireUser();
  run('DELETE FROM addresses WHERE id = ? AND user_id = ?', int(formData.get('id')), user.id);
  refresh();
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = int(formData.get('id'));
  if (get('SELECT 1 AS x FROM addresses WHERE id = ? AND user_id = ?', id, user.id)) {
    run('UPDATE addresses SET is_default = (id = ?) WHERE user_id = ?', id, user.id);
  }
  refresh();
}

/* ---------- Profile & password ---------- */

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const name = str(formData.get('name'), 100);
  const phone = str(formData.get('phone'), 20);
  const v = checker()
    .require(name.length >= 2, t('v.name'))
    .require(!phone || isPhone(phone), t('v.phone'));
  if (!v.ok) return { errors: v.errors };
  run('UPDATE users SET name = ?, phone = ? WHERE id = ?', name, phone, user.id);
  refresh();
  return { ok: true, message: t('msg.detailsUpdated') };
}

/** Shared by the customer account and the admin panel. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect('/account/login');
  const { t } = await getI18n();
  const limited = await rateLimit('login', `pw:${user.id}`);
  if (limited) return { errors: [limited] };

  const row = get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', user.id);
  const next = String(formData.get('new_password') ?? '');
  const errors: string[] = [];
  if (!(await verifyPassword(formData.get('current_password'), row?.password_hash))) errors.push(t('msg.wrongCurrentPassword'));
  const problem = passwordProblem(next, pwMessages(t));
  if (problem) errors.push(problem);
  if (next !== formData.get('new_password_confirm')) errors.push(t('msg.newPasswordsDiffer'));
  if (errors.length) return { errors };

  run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(next), user.id);
  await revokeUserSessions(user.id);
  return { ok: true, message: t('msg.passwordChanged') };
}

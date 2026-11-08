'use server';

import { cookies } from 'next/headers';
import { refresh } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/config';
import { isProd } from '@/lib/config';

/** Stores the visitor's language for a year. A plain form post, so it also works without JavaScript. */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get('locale');
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
}

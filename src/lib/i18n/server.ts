import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config.ts';
import { format, messages, type MessageKey } from './messages.ts';
import { formatDate, money } from '../format.ts';

/** The visitor's choice wins; on a first visit, follow the browser's preferred language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const first = ((await headers()).get('accept-language') || '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('pt') ? 'pt' : DEFAULT_LOCALE;
});

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const dict = messages[locale];
  const t: Translator = (key, vars) => format(dict[key], vars);
  return {
    locale,
    t,
    money: (pence: number | null | undefined) => money(pence, locale),
    date: (sql: string | null | undefined, withTime = false) => formatDate(sql, withTime, locale),
  };
});

/** `export const generateMetadata = titled('orders.title');` */
export const titled = (key: MessageKey) => async (): Promise<Metadata> => ({ title: (await getI18n()).t(key) });

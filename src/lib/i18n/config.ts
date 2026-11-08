/* Language setup shared by server and client. Safe to import anywhere. */
export const LOCALES = ['en', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'sm.lang';

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** BCP-47 tags: used for <html lang>, number and date formatting. */
export const INTL_TAG: Record<Locale, string> = { en: 'en-GB', pt: 'pt-PT' };

/** Reads a translated column: `pick(product, 'name', 'pt')` -> name_pt, falling back to name when it is blank. */
export function pick<T extends object, K extends keyof T & string>(row: T, field: K, locale: Locale): T[K] {
  if (locale !== 'en') {
    const translated = (row as Record<string, unknown>)[`${field}_${locale}`];
    if (typeof translated === 'string' && translated.trim()) return translated as T[K];
  }
  return row[field];
}

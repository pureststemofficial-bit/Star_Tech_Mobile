/* Pure formatting/parsing helpers. Safe to import from both server and client components. */
import { INTL_TAG, type Locale } from './i18n/config.ts';

const currency: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(INTL_TAG.en, { style: 'currency', currency: 'GBP' }),
  pt: new Intl.NumberFormat(INTL_TAG.pt, { style: 'currency', currency: 'GBP' }),
};
export const money = (pence: number | null | undefined, locale: Locale = 'en') => currency[locale].format((Number(pence) || 0) / 100);

/** "12.5" / "£1,299.99" -> pence integer, or null when not a valid amount. */
export function toPence(value: unknown): number | null {
  const s = String(value ?? '').replace(/[£,\s]/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
export const fromPence = (p: number | null | undefined) => ((Number(p) || 0) / 100).toFixed(2);

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export const lines = (text: string | null | undefined) =>
  String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** "Display: 6.1 inch" lines -> [{ key, value }] */
export function parseSpecs(text: string) {
  return lines(text).map((l) => {
    const i = l.indexOf(':');
    return i === -1 ? { key: l, value: '' } : { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
  });
}

const HEX = /^#[0-9a-f]{6}$/i;
/** "Natural Titanium|#8a8580" lines -> [{ name, hex }] (invalid colours fall back to grey). */
export function parseColours(text: string) {
  return lines(text).map((l) => {
    const [name, hex] = l.split('|').map((x) => x.trim());
    return { name, hex: HEX.test(hex || '') ? hex : '#c0c7d6' };
  });
}

/** "256GB|+100" lines -> [{ name, extraPence }] */
export function parseOptions(text: string) {
  return lines(text).map((l) => {
    const [name, extra] = l.split('|').map((x) => x.trim());
    const pence = extra ? toPence(extra.replace('+', '')) : 0;
    return { name, extraPence: pence || 0 };
  });
}

export function formatDate(sqlDate: string | null | undefined, withTime = false, locale: Locale = 'en'): string {
  if (!sqlDate) return '';
  const d = new Date(sqlDate.length === 10 ? sqlDate : sqlDate.replace(' ', 'T') + 'Z');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString(INTL_TAG[locale], opts);
}

export const label = (s: string | null | undefined) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

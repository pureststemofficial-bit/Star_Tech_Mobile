import path from 'node:path';

const ROOT = process.cwd();

export const isProd = process.env.NODE_ENV === 'production';
export const dataDir = process.env.DATA_DIR || path.join(ROOT, 'data');
export const dbFile = process.env.DB_FILE || path.join(dataDir, 'store.db');
// Uploads live outside /public: Next.js only serves public files that existed at build time.
export const uploadDir = path.join(dataDir, 'uploads');
// Number of reverse proxies in front of the app (1 behind Nginx/Cloudflare); used to find the client IP.
export const trustProxy = Number(process.env.TRUST_PROXY) || 0;

/** The payment option stored on orders paid through Stripe. Offered only when a key is set. */
export const CARD_METHOD = 'Card (secure payment via Stripe)';
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** SITE_URL as a URL. A bare domain gets https://; anything unusable gives null, so a typo can't take the site down. */
export function siteUrl(raw = process.env.SITE_URL): URL | null {
  const value = (raw || '').trim();
  if (!value) return null;
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
}

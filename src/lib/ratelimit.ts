import 'server-only';
import { headers } from 'next/headers';
import { trustProxy } from './config.ts';
import { getI18n } from './i18n/server.ts';

/*
 * Small in-memory fixed-window rate limiter (per process). For several servers behind a load
 * balancer, swap this for a shared store such as Redis.
 */
type Bucket = { count: number; reset: number };
const g = globalThis as typeof globalThis & { __startechRate?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__startechRate ??= new Map());

const RULES = {
  login: { windowMs: 15 * 60_000, limit: 10, message: 'rate.login' },
  register: { windowMs: 60 * 60_000, limit: 10, message: 'rate.register' },
  forms: { windowMs: 10 * 60_000, limit: 8, message: 'rate.forms' },
  checkout: { windowMs: 10 * 60_000, limit: 15, message: 'rate.checkout' },
  cart: { windowMs: 60_000, limit: 60, message: 'rate.cart' },
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = (h.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  // With N trusted proxies the client is the Nth address from the right; otherwise use the last
  // entry, which Next.js fills in from the socket.
  if (forwarded.length) return forwarded[Math.max(0, forwarded.length - Math.max(1, trustProxy))];
  return h.get('x-real-ip') || 'local';
}

/** Returns an error message when the limit is exceeded, otherwise null. */
export async function rateLimit(rule: keyof typeof RULES, extraKey = ''): Promise<string | null> {
  const { windowMs, limit, message } = RULES[rule];
  const key = `${rule}:${await clientIp()}:${extraKey}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return b.count > limit ? (await getI18n()).t(message) : null;
}

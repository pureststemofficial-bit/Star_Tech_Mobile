import crypto from 'node:crypto';

export * from './format.ts';

export function randomRef(prefix: string): string {
  const n = crypto.randomInt(100000, 999999);
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}${d}${n}`;
}

/** Only allow redirects to local paths, never `//evil.com` or absolute URLs. */
export function safeRedirectPath(p: unknown, fallback = '/'): string {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return fallback;
  return p;
}

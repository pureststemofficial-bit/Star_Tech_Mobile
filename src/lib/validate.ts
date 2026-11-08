/** Trim, strip control characters and enforce a maximum length. Accepts FormData values. */
export function str(value: unknown, max = 200): string {
  if (value === undefined || value === null || typeof value === 'object') return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
export const isEmail = (v: unknown): v is string => typeof v === 'string' && v.length <= 254 && EMAIL.test(v);
export const isPhone = (v: string) => /^[+0-9 ()-]{7,20}$/.test(v);
export const isPostcode = (v: string) => /^[A-Z0-9 -]{3,10}$/i.test(v);
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function int(value: unknown, { min = -Infinity, max = Infinity, fallback = 0 } = {}): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const bool = (value: unknown): 0 | 1 => (value === 'on' || value === '1' || value === 'true' || value === true ? 1 : 0);

/** Restrict a value to a known set (used for sort orders, statuses, etc). */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Collect validation errors with a small fluent helper. */
export function checker() {
  const errors: string[] = [];
  const api = {
    errors,
    require(cond: unknown, msg: string) {
      if (!cond) errors.push(msg);
      return api;
    },
    get ok() {
      return errors.length === 0;
    },
  };
  return api;
}

/** Read named FormData fields as trimmed, length-limited strings. */
export function fields<K extends string>(formData: FormData, spec: Record<K, number>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(spec) as K[]) out[key] = str(formData.get(key), spec[key]);
  return out;
}

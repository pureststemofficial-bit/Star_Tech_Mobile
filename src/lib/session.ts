import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { get, run } from './db.ts';
import { isProd } from './config.ts';
import type { Flash, SessionData } from './types.ts';

/*
 * Server-side sessions. The browser only holds a random 256-bit ID in an HttpOnly cookie; the
 * database stores its SHA-256 hash plus the session data (user, cart, flash message).
 * Cookies can only be written in Server Actions / Route Handlers, so pages only ever read.
 */
const COOKIE = 'sm.sid';
const MAX_AGE = 14 * 24 * 60 * 60; // seconds

interface Session { id: string; userId: number | null; data: SessionData }

const hash = (id: string) => crypto.createHash('sha256').update(id).digest('hex');

async function cookieId(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  return v && /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null;
}

function load(id: string | null): Session | null {
  if (!id) return null;
  const row = get<{ user_id: number | null; data: string; expires: number }>(
    'SELECT user_id, data, expires FROM sessions WHERE id_hash = ?', hash(id));
  if (!row || row.expires < Date.now()) return null;
  return { id, userId: row.user_id, data: JSON.parse(row.data) as SessionData };
}

/** Read the current session (or null). Safe to call while rendering. */
export async function readSession(): Promise<Session | null> {
  return load(await cookieId());
}

async function setCookie(id: string) {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: MAX_AGE,
  });
}

function create(userId: number | null, data: SessionData): string {
  const id = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions (id_hash, user_id, data, expires) VALUES (?, ?, ?, ?)',
    hash(id), userId, JSON.stringify(data), Date.now() + MAX_AGE * 1000);
  return id;
}

/**
 * Change session data from a Server Action. Creates a session (and cookie) on first use and
 * slides the expiry forward.
 */
export async function updateSession(mutate: (data: SessionData) => void): Promise<SessionData> {
  let s = load(await cookieId());
  if (!s) s = { id: create(null, {}), userId: null, data: {} };
  mutate(s.data);
  run('UPDATE sessions SET data = ?, expires = ? WHERE id_hash = ?',
    JSON.stringify(s.data), Date.now() + MAX_AGE * 1000, hash(s.id));
  await setCookie(s.id);
  return s.data;
}

/** Store a one-time message shown on the next page render. */
export const flash = (type: Flash['type'], message: string) => updateSession((d) => { d.flash = { type, message }; });

/** Read and clear the flash message while rendering (a database write only; no cookie change). */
export async function takeFlash(): Promise<Flash | null> {
  const s = await readSession();
  if (!s || !s.data.flash) return null;
  const f = s.data.flash;
  delete s.data.flash;
  run('UPDATE sessions SET data = ? WHERE id_hash = ?', JSON.stringify(s.data), hash(s.id));
  return f;
}

/**
 * Sign a user in. A brand-new session ID is issued (prevents session fixation) and the cart is
 * carried over so shoppers don't lose it when they sign in at checkout.
 */
export async function startUserSession(userId: number) {
  const old = load(await cookieId());
  const data: SessionData = { cart: old?.data.cart || [], recentOrders: old?.data.recentOrders || [] };
  if (old) run('DELETE FROM sessions WHERE id_hash = ?', hash(old.id));
  await setCookie(create(userId, data));
}

export async function endSession() {
  const id = await cookieId();
  if (id) run('DELETE FROM sessions WHERE id_hash = ?', hash(id));
  (await cookies()).delete(COOKIE);
}

/** Sign a user out of every other session (after a password change or account disable). */
export async function revokeUserSessions(userId: number, keepCurrent = true) {
  const id = keepCurrent ? await cookieId() : null;
  run('DELETE FROM sessions WHERE user_id = ? AND id_hash != ?', userId, id ? hash(id) : '');
}

// Hourly cleanup of expired sessions.
const g = globalThis as typeof globalThis & { __startechSessionPrune?: NodeJS.Timeout };
if (!g.__startechSessionPrune) {
  g.__startechSessionPrune = setInterval(() => run('DELETE FROM sessions WHERE expires < ?', Date.now()), 3600_000);
  g.__startechSessionPrune.unref();
}

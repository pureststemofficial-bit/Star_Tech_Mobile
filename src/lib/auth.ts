import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { get } from './db.ts';
import { readSession } from './session.ts';
import type { User } from './types.ts';

/** The signed-in user for this request, or null. Memoised per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const s = await readSession();
  if (!s || !s.userId) return null;
  const user = get<User>('SELECT id, name, email, phone, role, is_active FROM users WHERE id = ?', s.userId);
  return user && user.is_active ? user : null;
});

export async function requireUser(next = '/account'): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/account/login?next=' + encodeURIComponent(next));
  return user;
}

/** Every admin page AND every admin Server Action calls this; never rely on the layout alone. */
export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || user.role !== 'admin') redirect('/admin/login');
  return user;
}

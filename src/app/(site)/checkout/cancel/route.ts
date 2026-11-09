import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { settleSession, stripe, type PaymentState } from '@/lib/payments';
import { flash, readSession, updateSession } from '@/lib/session';
import * as cart from '@/lib/cart';
import { get } from '@/lib/db';
import { str } from '@/lib/validate';
import { getI18n } from '@/lib/i18n/server';

/* Where Stripe sends a customer who backs out. The basket was kept, so they can try again. */
export async function GET(request: NextRequest) {
  const number = str(request.nextUrl.searchParams.get('order'), 30);
  const session = await readSession();
  const order = session?.data.recentOrders?.includes(number)
    ? get<{ stripe_session_id: string }>(`SELECT stripe_session_id FROM orders WHERE order_number = ? AND payment_status = 'unpaid'`, number)
    : undefined;

  let settled: { orderNumber: string; state: PaymentState } | null = null;
  if (order?.stripe_session_id) {
    try {
      // End the session first so it can't be paid after the order is cancelled.
      const current = await stripe().checkout.sessions.retrieve(order.stripe_session_id);
      settled = settleSession(current.status === 'open' ? await stripe().checkout.sessions.expire(current.id) : current);
    } catch (err) {
      console.error('Stripe cancel failed:', err instanceof Error ? err.message : err);
    }
  }

  if (settled && (settled.state === 'paid' || settled.state === 'pending')) {
    await updateSession((s) => cart.clear(s));
    redirect(`/order/${number}`);
  }

  const { t } = await getI18n();
  await flash('info', t('checkout.cardCancelled'));
  redirect('/cart');
}

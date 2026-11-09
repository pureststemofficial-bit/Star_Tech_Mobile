import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { settleSession, stripe, type PaymentState } from '@/lib/payments';
import { flash, updateSession } from '@/lib/session';
import * as cart from '@/lib/cart';
import { str } from '@/lib/validate';
import { getI18n } from '@/lib/i18n/server';

/* Where Stripe sends the customer after paying. The result is read from Stripe, never the URL. */
export async function GET(request: NextRequest) {
  const id = str(request.nextUrl.searchParams.get('session_id'), 200);
  let settled: { orderNumber: string; state: PaymentState } | null = null;
  if (id.startsWith('cs_')) {
    try {
      settled = settleSession(await stripe().checkout.sessions.retrieve(id));
    } catch (err) {
      console.error('Stripe return failed:', err instanceof Error ? err.message : err);
    }
  }

  if (settled && (settled.state === 'paid' || settled.state === 'pending')) {
    const { orderNumber } = settled;
    await updateSession((s) => {
      if (s.recentOrders?.includes(orderNumber)) cart.clear(s);
    });
    redirect(`/order/${orderNumber}`);
  }

  const { t } = await getI18n();
  await flash('error', t('checkout.cardNotPaid'));
  redirect('/cart');
}

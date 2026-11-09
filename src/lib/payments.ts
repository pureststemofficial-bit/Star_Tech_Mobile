import 'server-only';
import Stripe from 'stripe';
import { all, get, run, tx } from './db.ts';
import { invalidate } from './store.ts';
import type { CartSummary } from './cart.ts';
import { pick, type Locale } from './i18n/config.ts';

/*
 * Stripe's hosted Checkout takes the card details, so they never touch this server.
 * The order is created first (taking its stock), then paid or released according to what Stripe
 * reports. Both the customer's return and the webhook go through settleSession, so it is safe for
 * them to arrive in either order or more than once.
 */
let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY as string, { maxNetworkRetries: 2 });
  return client;
}

interface CheckoutInput {
  orderNumber: string;
  email: string;
  cart: CartSummary;
  locale: Locale;
  deliveryLabel: string;
  origin: string;
}

/** Stripe needs at least 30 minutes; the order's stock stays reserved until the session ends. */
const SESSION_MINUTES = 30;

/** Create the hosted payment page for an order, remember its ID, and return its URL. */
export async function createCheckoutSession(input: CheckoutInput): Promise<string> {
  const { orderNumber, email, cart, locale, deliveryLabel, origin } = input;
  const line = (name: string, pence: number, quantity: number): Stripe.Checkout.SessionCreateParams.LineItem => ({
    quantity,
    price_data: { currency: 'gbp', unit_amount: pence, product_data: { name } },
  });
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    integration_identifier: 'startech_checkout_qmvtkzrb',
    customer_email: email,
    client_reference_id: orderNumber,
    metadata: { order_number: orderNumber },
    locale: locale === 'pt' ? 'pt' : 'en',
    expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60 + 60,
    line_items: [
      ...cart.lines.map((l) => line([pick(l.product, 'name', locale), l.variant].filter(Boolean).join(' - '), l.unit, l.qty)),
      ...(cart.delivery ? [line(deliveryLabel, cart.delivery, 1)] : []),
    ],
    success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel?order=${encodeURIComponent(orderNumber)}`,
  }, { idempotencyKey: `order-${orderNumber}` });
  run('UPDATE orders SET stripe_session_id = ? WHERE order_number = ?', session.id, orderNumber);
  if (!session.url) throw new Error('Stripe returned no payment page URL');
  return session.url;
}

/** Cancel an unpaid order and return its stock. Does nothing if it was already released or paid. */
export function releaseOrder(orderNumber: string) {
  tx(() => {
    const changed = run(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now')
                         WHERE order_number = ? AND status = 'processing' AND payment_status = 'unpaid'`, orderNumber);
    if (changed.changes !== 1) return;
    for (const it of all<{ product_id: number; qty: number }>(
      `SELECT i.product_id, i.qty FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.order_number = ? AND i.product_id IS NOT NULL`, orderNumber)) {
      run('UPDATE products SET stock = stock + ?, sold_count = MAX(0, sold_count - ?) WHERE id = ?', it.qty, it.qty, it.product_id);
    }
  });
  invalidate();
}

export type PaymentState = 'paid' | 'pending' | 'cancelled' | 'open';
type SessionFacts = Pick<Stripe.Checkout.Session, 'id' | 'status' | 'payment_status'>;

/** Bring an order in line with its Stripe session. Returns null if the session isn't one of ours. */
export function settleSession(session: SessionFacts): { orderNumber: string; state: PaymentState } | null {
  const order = get<{ order_number: string }>('SELECT order_number FROM orders WHERE stripe_session_id = ?', session.id);
  if (!order) return null;
  const orderNumber = order.order_number;
  if (session.status === 'expired') {
    releaseOrder(orderNumber);
    return { orderNumber, state: 'cancelled' };
  }
  if (session.status !== 'complete') return { orderNumber, state: 'open' };
  // A delayed payment method can complete the session before the money has arrived.
  if (session.payment_status === 'unpaid') return { orderNumber, state: 'pending' };
  run(`UPDATE orders SET payment_status = 'paid', updated_at = datetime('now')
       WHERE order_number = ? AND payment_status = 'unpaid'`, orderNumber);
  return { orderNumber, state: 'paid' };
}

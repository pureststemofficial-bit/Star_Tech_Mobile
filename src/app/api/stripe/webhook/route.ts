import type Stripe from 'stripe';
import { releaseOrder, settleSession, stripe } from '@/lib/payments';

/* Stripe's server-to-server notice of payment results. Trusted only if its signature checks out. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.expired':
      settleSession(event.data.object);
      break;
    case 'checkout.session.async_payment_failed': {
      const settled = settleSession(event.data.object);
      if (settled) releaseOrder(settled.orderNumber);
      break;
    }
  }
  return Response.json({ received: true });
}

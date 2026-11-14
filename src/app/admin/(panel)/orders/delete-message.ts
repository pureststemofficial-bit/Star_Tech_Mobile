import type { Order } from '@/lib/types';

/** The confirmation shown before deleting an order, with a warning when money has been taken. */
export function deleteMessage(o: Pick<Order, 'order_number' | 'payment_status' | 'status'>) {
  const parts = [`Delete order #${o.order_number} permanently? This cannot be undone.`];
  if (o.status === 'processing') parts.push('Its items will be returned to stock.');
  if (o.payment_status === 'paid') parts.push('It is marked as paid: deleting it does not refund the customer.');
  return parts.join('\n\n');
}

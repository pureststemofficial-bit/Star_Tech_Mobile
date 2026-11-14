import { all, get, run, tx } from './db.ts';

/**
 * Permanently delete an order and its items. If it was still being processed, its items go back
 * into stock (shipped or delivered goods have left the shop; cancelled orders were already returned).
 * Nothing is refunded: card payments must be refunded in Stripe.
 * Returns the deleted order's number, or null if there was no such order.
 */
export function removeOrder(id: number): string | null {
  return tx(() => {
    const order = get<{ id: number; order_number: string; status: string }>('SELECT id, order_number, status FROM orders WHERE id = ?', id);
    if (!order) return null;
    if (order.status === 'processing') {
      for (const it of all<{ product_id: number; qty: number }>(
        'SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', order.id)) {
        run('UPDATE products SET stock = stock + ?, sold_count = MAX(0, sold_count - ?) WHERE id = ?', it.qty, it.qty, it.product_id);
      }
    }
    run('DELETE FROM orders WHERE id = ?', order.id); // order_items go with it (ON DELETE CASCADE)
    return order.order_number;
  });
}

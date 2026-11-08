import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { OrderDetail } from '@/components/site/order-detail';
import { requireUser } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { str } from '@/lib/validate';
import { getI18n } from '@/lib/i18n/server';
import { paymentLabel } from '@/lib/store';
import type { Order, OrderItem } from '@/lib/types';

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser('/account/orders');
  // Scoped to the signed-in user, so one customer can never open another's order.
  const order = get<Order>('SELECT * FROM orders WHERE order_number = ? AND user_id = ?', str((await params).number, 30), user.id);
  if (!order) notFound();
  const items = all<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', order.id);
  const { t, locale } = await getI18n();
  return (
    <Card>
      <CardContent className="grid gap-4">
        <Link href="/account/orders" className="inline-block py-2 text-sm font-medium text-primary hover:underline">{t('orders.back')}</Link>
        <OrderDetail order={order} items={items} paymentLabel={paymentLabel(order.payment_method, locale)} />
      </CardContent>
    </Card>
  );
}

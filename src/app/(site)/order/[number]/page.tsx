import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/site/container';
import { OrderDetail } from '@/components/site/order-detail';
import { get, all } from '@/lib/db';
import { readSession } from '@/lib/session';
import { currentUser } from '@/lib/auth';
import { str } from '@/lib/validate';
import { getI18n, titled } from '@/lib/i18n/server';
import { paymentLabel } from '@/lib/store';
import type { Order, OrderItem } from '@/lib/types';

export const generateMetadata = titled('confirm.meta');

// Only the browser session that placed the order (or its signed-in owner) can see this page.
export default async function OrderConfirmation({ params }: { params: Promise<{ number: string }> }) {
  const number = str((await params).number, 30);
  const order = get<Order>('SELECT * FROM orders WHERE order_number = ?', number);
  const [session, user] = await Promise.all([readSession(), currentUser()]);
  const allowed = order && ((session?.data.recentOrders || []).includes(number) || (user && order.user_id === user.id));
  if (!order || !allowed) notFound();
  const items = all<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', order.id);
  const { t, locale } = await getI18n();

  return (
    <Container className="max-w-3xl">
      <Card className="mt-8">
        <CardContent className="grid gap-6">
          <div className="text-center">
            <span className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-success-soft text-success"><Check className="size-8" /></span>
            <h1 className="font-display text-5xl">{t('confirm.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t(order.payment_status === 'paid' ? 'confirm.bodyPaid' : 'confirm.body', { email: order.email })}</p>
          </div>
          <OrderDetail order={order} items={items} paymentLabel={paymentLabel(order.payment_method, locale)} />
          <div className="text-center"><Button asChild variant="ink"><Link href="/shop">{t('confirm.continue')}</Link></Button></div>
        </CardContent>
      </Card>
    </Container>
  );
}

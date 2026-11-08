import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderDetail } from '@/components/site/order-detail';
import { requireUser } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { getI18n, titled } from '@/lib/i18n/server';
import { paymentLabel } from '@/lib/store';
import type { Order, OrderItem } from '@/lib/types';

export const generateMetadata = titled('meta.account');

export default async function AccountDashboard() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const latest = get<Order>('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1', user.id);
  const items = latest ? all<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', latest.id) : [];
  return (
    <>
      <Card>
        <CardHeader>
          <h1 className="font-display text-5xl leading-none">{t('account.title')}</h1>
          <CardDescription>{t('account.hello', { name: user.name })}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('account.tracking')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {latest ? (
            <>
              <OrderDetail order={latest} items={items} paymentLabel={paymentLabel(latest.payment_method, locale)} />
              <div><Button asChild variant="white" size="sm"><Link href="/account/orders">{t('account.viewOrders')}</Link></Button></div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">{t('account.noOrders')}</p>
              <div><Button asChild variant="ink"><Link href="/shop">{t('basket.start')}</Link></Button></div>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('account.help')}</CardTitle>
          <CardDescription>{t('account.helpBody')}</CardDescription>
        </CardHeader>
        <CardContent><Button asChild variant="ink"><Link href="/contact">{t('account.contact')}</Link></Button></CardContent>
      </Card>
    </>
  );
}

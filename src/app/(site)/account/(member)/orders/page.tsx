import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/site/bits';
import { requireUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { getI18n, titled } from '@/lib/i18n/server';
import type { Order } from '@/lib/types';

export const generateMetadata = titled('meta.orders');

export default async function OrdersPage() {
  const user = await requireUser('/account/orders');
  const { t, money, date } = await getI18n();
  const orders = all<Order>('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', user.id);
  return (
    <Card>
      <CardHeader><h1 className="font-display text-5xl leading-none">{t('orders.title')}</h1></CardHeader>
      <CardContent>
        {!orders.length ? (
          <div className="grid justify-items-start gap-4">
            <p className="text-muted-foreground">{t('orders.none')}</p>
            <Button asChild variant="ink"><Link href="/shop">{t('basket.start')}</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>{t('orders.colOrder')}</TableHead><TableHead>{t('orders.colDate')}</TableHead><TableHead>{t('orders.colStatus')}</TableHead><TableHead>{t('orders.colTotal')}</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-semibold">#{o.order_number}</TableCell>
                  <TableCell>{date(o.created_at)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell>{money(o.total_pence)}</TableCell>
                  <TableCell><Button asChild size="sm" variant="white"><Link href={`/account/orders/${o.order_number}`}>{t('orders.details')}</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

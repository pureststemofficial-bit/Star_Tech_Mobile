import type { Metadata } from 'next';
import Link from 'next/link';
import Form from 'next/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterTabs, PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { requireAdmin } from '@/lib/auth';
import { get, all, type Param } from '@/lib/db';
import { escapeLike } from '@/lib/catalog';
import { formatDate, label, money } from '@/lib/format';
import { str, int, oneOf } from '@/lib/validate';
import type { Order } from '@/lib/types';

export const metadata: Metadata = { title: 'Orders' };
const STATUSES = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const;
const PER_PAGE = 30;

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = oneOf(sp.status, ['', ...STATUSES], '');
  const q = str(sp.q, 100);
  const page = int(sp.page, { min: 1, max: 10000, fallback: 1 });
  const where = ['1 = 1'];
  const params: Param[] = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (q) {
    const l = `%${escapeLike(q)}%`;
    where.push("(order_number LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR full_name LIKE ? ESCAPE '\\')");
    params.push(l, l, l);
  }
  const w = where.join(' AND ');
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM orders WHERE ${w}`, ...params)?.n ?? 0;
  const orders = all<Order>(`SELECT * FROM orders WHERE ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, PER_PAGE, (page - 1) * PER_PAGE);

  return (
    <>
      <PageHeader title="Orders" description={`${total} orders`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs active={status} items={[{ key: '', label: 'All', href: '/admin/orders' }, ...STATUSES.map((s) => ({ key: s, label: label(s), href: `/admin/orders?status=${s}` }))]} />
        <Form action="/admin/orders" className="flex gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Input name="q" type="search" defaultValue={q} placeholder="Order no., name or email" aria-label="Search orders" className="w-60" />
          <Button type="submit" variant="white">Search</Button>
        </Form>
      </div>
      <Card className="py-2">
        <CardContent className="px-2">
          {!orders.length ? <p className="p-4 text-sm text-muted-foreground">No orders found.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary">#{o.order_number}</Link></TableCell>
                    <TableCell>{formatDate(o.created_at, true)}</TableCell>
                    <TableCell>{o.full_name}<div className="text-xs text-muted-foreground">{o.email}</div></TableCell>
                    <TableCell>{money(o.total_pence)}</TableCell>
                    <TableCell><StatusBadge status={o.payment_status} /></TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} base="/admin/orders" params={{ status, q }} />
        </CardContent>
      </Card>
    </>
  );
}

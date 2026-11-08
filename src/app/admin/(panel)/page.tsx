import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/site/bits';
import { PageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { formatDate, money } from '@/lib/format';
import type { Order, Repair } from '@/lib/types';

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = get<Record<'revenue' | 'orders' | 'orders_today' | 'processing' | 'products' | 'low_stock' | 'customers' | 'new_repairs' | 'unread', number>>(`SELECT
      (SELECT COALESCE(SUM(total_pence), 0) FROM orders WHERE status != 'cancelled') AS revenue,
      (SELECT COUNT(*) FROM orders WHERE status != 'cancelled') AS orders,
      (SELECT COUNT(*) FROM orders WHERE date(created_at) = date('now')) AS orders_today,
      (SELECT COUNT(*) FROM orders WHERE status = 'processing') AS processing,
      (SELECT COUNT(*) FROM products WHERE is_active = 1) AS products,
      (SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock < 5) AS low_stock,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
      (SELECT COUNT(*) FROM repairs WHERE status = 'new') AS new_repairs,
      (SELECT COUNT(*) FROM messages WHERE is_read = 0) AS unread`)!;
  const daily = new Map(all<{ day: string; total: number; n: number }>(`SELECT date(created_at) AS day, SUM(total_pence) AS total, COUNT(*) AS n
      FROM orders WHERE status != 'cancelled' AND created_at >= date('now', '-13 days') GROUP BY day`).map((d) => [d.day, d]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { day, total: daily.get(day)?.total ?? 0, n: daily.get(day)?.n ?? 0 };
  });
  const recentOrders = all<Order>('SELECT * FROM orders ORDER BY id DESC LIMIT 8');
  const recentRepairs = all<Repair>('SELECT * FROM repairs ORDER BY id DESC LIMIT 5');
  const lowStock = all<{ id: number; name: string; stock: number }>('SELECT id, name, stock FROM products WHERE is_active = 1 AND stock < 5 ORDER BY stock LIMIT 6');

  const tiles = [
    { label: 'Revenue (all time)', value: money(stats.revenue), sub: `${stats.orders} order${stats.orders === 1 ? '' : 's'}` },
    { label: 'Orders today', value: stats.orders_today, sub: <Link href="/admin/orders?status=processing" className="text-primary">{stats.processing} to process</Link> },
    { label: 'New repair bookings', value: stats.new_repairs, sub: <Link href="/admin/repairs?status=new" className="text-primary">View bookings</Link> },
    { label: 'Products', value: stats.products, sub: <span className={stats.low_stock ? 'font-semibold text-warning' : ''}>{stats.low_stock} low on stock</span> },
    { label: 'Customers', value: stats.customers, sub: <Link href="/admin/messages" className="text-primary">{stats.unread} unread messages</Link> },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-semibold text-muted-foreground">{t.label}</p>
              <p className="my-1 text-2xl font-bold tabular-nums">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue — last 14 days</CardTitle>
          <CardDescription>Excludes cancelled orders. Hover a bar for the exact figure.</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart days={days} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
            <CardAction><Link href="/admin/orders" className="text-sm font-semibold text-primary">View all</Link></CardAction>
          </CardHeader>
          <CardContent>
            {!recentOrders.length ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary">#{o.order_number}</Link><div className="text-xs text-muted-foreground">{formatDate(o.created_at, true)}</div></TableCell>
                      <TableCell>{o.full_name}</TableCell>
                      <TableCell>{money(o.total_pence)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest repairs</CardTitle>
              <CardAction><Link href="/admin/repairs" className="text-sm font-semibold text-primary">View all</Link></CardAction>
            </CardHeader>
            <CardContent>
              {!recentRepairs.length ? <p className="text-sm text-muted-foreground">No repair bookings yet.</p> : (
                <ul className="divide-y text-sm">
                  {recentRepairs.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/admin/repairs/${r.id}`} className="truncate hover:text-primary">{r.full_name} — {r.brand} {r.model}</Link>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Low stock</CardTitle></CardHeader>
            <CardContent>
              {!lowStock.length ? <p className="text-sm text-muted-foreground">All products are well stocked.</p> : (
                <ul className="divide-y text-sm">
                  {lowStock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/admin/products/${p.id}`} className="truncate hover:text-primary">{p.name}</Link>
                      <Badge variant={p.stock === 0 ? 'destructive' : 'warning'}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Single-series bar chart: one hue, thin bars, recessive axis, native tooltip per bar. */
function RevenueChart({ days }: { days: { day: string; total: number; n: number }[] }) {
  if (!days.some((d) => d.total)) {
    return <p className="text-sm text-muted-foreground">No sales in the last 14 days yet. Orders will appear here as they come in.</p>;
  }
  const W = 700, H = 180, gap = 2;
  const bw = W / days.length - gap;
  const max = Math.max(...days.map((d) => d.total));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Daily revenue for the last 14 days" className="h-auto w-full overflow-visible">
        <line x1="0" y1={H} x2={W} y2={H} className="stroke-border" />
        <line x1="0" y1="8" x2={W} y2="8" className="stroke-border" strokeDasharray="3 4" />
        <text x={W} y="4" textAnchor="end" className="fill-muted-foreground text-[11px]">{money(max)}</text>
        {days.map((d, i) => {
          const bh = d.total ? Math.max(4, (d.total / max) * (H - 12)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={d.day} tabIndex={0} className="group outline-none" aria-label={`${formatDate(d.day)}: ${money(d.total)}, ${d.n} orders`}>
              <title>{`${formatDate(d.day)} — ${money(d.total)} (${d.n} orders)`}</title>
              <rect x={x} y="0" width={bw} height={H} className="fill-transparent group-hover:fill-primary/5 group-focus:fill-primary/5" />
              {bh ? <rect x={x} y={H - bh} width={bw} height={bh} rx="4" className="fill-primary group-hover:fill-navy group-focus:fill-navy" /> : null}
              {i % 2 === 1 ? <text x={x + bw / 2} y={H + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">{d.day.slice(8)}/{d.day.slice(5, 7)}</text> : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

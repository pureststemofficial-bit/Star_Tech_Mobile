import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { PageHeader } from '@/components/admin/page-header';
import { DetailList } from '@/components/admin/detail-list';
import { updateOrder } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { formatDate, label, money } from '@/lib/format';
import { int } from '@/lib/validate';
import type { Order, OrderItem } from '@/lib/types';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const order = get<Order>('SELECT * FROM orders WHERE id = ?', int((await params).id));
  if (!order) notFound();
  const items = all<OrderItem>('SELECT * FROM order_items WHERE order_id = ?', order.id);

  return (
    <>
      <PageHeader title={`Order #${order.order_number}`} description={`Placed ${formatDate(order.created_at, true)}`} back={{ href: '/admin/orders', label: 'All orders' }} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead /><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.image || '/img/products/placeholder.svg'} alt="" width={44} height={44} className="size-11 rounded-md bg-muted object-contain p-0.5" />
                      </TableCell>
                      <TableCell><strong>{it.name}</strong><div className="text-xs text-muted-foreground">{it.variant}</div></TableCell>
                      <TableCell>{money(it.price_pence)}</TableCell>
                      <TableCell>{it.qty}</TableCell>
                      <TableCell className="text-right">{money(it.price_pence * it.qty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow><TableCell colSpan={4}>Subtotal</TableCell><TableCell className="text-right">{money(order.subtotal_pence)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={4}>Delivery</TableCell><TableCell className="text-right">{money(order.delivery_pence)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={4} className="font-bold">Total</TableCell><TableCell className="text-right font-bold">{money(order.total_pence)}</TableCell></TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[
                ['Name', order.full_name],
                ['Email', <a key="e" href={`mailto:${order.email}`} className="text-primary">{order.email}</a>],
                ['Phone', <a key="p" href={`tel:${order.phone}`} className="text-primary">{order.phone}</a>],
                ['Address', `${order.line1}${order.line2 ? `, ${order.line2}` : ''}, ${order.city}, ${order.postcode}`],
                ['Payment method', order.payment_method],
                ['Account', order.user_id ? 'Registered customer' : 'Guest checkout'],
                ...(order.notes ? [['Notes', order.notes] as [string, string]] : []),
              ]} />
            </CardContent>
          </Card>
        </div>
        <Card className="xl:sticky xl:top-20">
          <CardHeader><CardTitle className="text-base">Update order</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={updateOrder} toastOnSuccess className="grid gap-4">
              <input type="hidden" name="id" value={order.id} />
              <Field label="Order status" htmlFor="status" hint="Cancelling returns the items to stock.">
                <NativeSelect id="status" name="status" defaultValue={order.status}>
                  {['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Payment status" htmlFor="payment_status">
                <NativeSelect id="payment_status" name="payment_status" defaultValue={order.payment_status}>
                  {['unpaid', 'paid', 'refunded'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Tracking number" htmlFor="tracking_number"><Input id="tracking_number" name="tracking_number" defaultValue={order.tracking_number} maxLength={60} /></Field>
              <SubmitButton className="w-full">Save</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

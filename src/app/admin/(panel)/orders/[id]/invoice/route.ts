import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { invoicePdf } from '@/lib/invoice';
import { settings } from '@/lib/store';
import { int } from '@/lib/validate';
import type { Order, OrderItem } from '@/lib/types';

/**
 * GET /admin/orders/:id/invoice opens the order's invoice PDF in the browser;
 * add ?download=1 to save it as a file instead. Admins only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const order = get<Order>('SELECT * FROM orders WHERE id = ?', int((await params).id));
  if (!order) notFound();
  const items = all<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', order.id);
  const s = settings();
  const pdf = invoicePdf(order, items, { name: s.site_name, address: s.address, phone: s.phone, email: s.email, taxNumber: s.tax_number });

  const download = new URL(request.url).searchParams.has('download');
  return new Response(pdf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="invoice-${order.order_number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

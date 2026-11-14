import { A4, PdfPage, fit, renderPdf } from './pdf.ts';
import { label, money } from './format.ts';
import type { Order, OrderItem } from './types.ts';

/* The invoice for an order, as a PDF (Admin -> Orders -> Invoice). */

export interface InvoiceShop { name: string; address: string; phone: string; email: string; taxNumber: string }

const INK: [number, number, number] = [0.07, 0.08, 0.1];
const MUTED: [number, number, number] = [0.42, 0.44, 0.48];
const BAND: [number, number, number] = [0.95, 0.96, 0.97];
const M = 50; // page margin
const RIGHT = A4.width - M;
const COL = { qty: 360, unit: 450, total: RIGHT }; // right edges of the number columns

const eur = (pence: number) => money(pence, 'en');
const day = (sqlDate: string) => {
  const [y, m, d] = sqlDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export function invoicePdf(order: Order, items: OrderItem[], shop: InvoiceShop): Uint8Array {
  const pages: PdfPage[] = [];
  let page!: PdfPage;
  let y = 0;

  const tableHeader = () => {
    page.rect(M, y - 7, RIGHT - M, 22, BAND);
    const h = { size: 8.5, bold: true, color: MUTED } as const;
    page.text(M + 8, y, 'ITEM', h);
    page.text(COL.qty, y, 'QTY', { ...h, align: 'right' });
    page.text(COL.unit, y, 'UNIT PRICE', { ...h, align: 'right' });
    page.text(COL.total - 8, y, 'AMOUNT', { ...h, align: 'right' });
    y -= 30;
  };

  const newPage = (first: boolean) => {
    page = new PdfPage();
    pages.push(page);
    y = A4.height - M;
    if (!first) {
      page.text(M, y, `${shop.name} · Invoice ${order.order_number} (continued)`, { size: 9, color: MUTED });
      y -= 30;
      tableHeader();
    }
  };

  // Header: shop on the left, invoice details on the right.
  newPage(true);
  page.text(M, y - 6, shop.name, { size: 20, bold: true, color: INK });
  page.text(RIGHT, y - 6, 'INVOICE', { size: 20, bold: true, color: INK, align: 'right' });
  let left = y - 26;
  for (const l of [...lines(shop.address), shop.phone, shop.email, shop.taxNumber && `NIF: ${shop.taxNumber}`].filter(Boolean) as string[]) {
    page.text(M, left, l, { size: 9, color: MUTED });
    left -= 13;
  }
  let right = y - 26;
  for (const [k, v] of [['Invoice no.', order.order_number], ['Invoice date', day(order.created_at)], ['Order status', label(order.status)], ['Payment', label(order.payment_status)]]) {
    page.text(RIGHT - 110, right, k, { size: 9, color: MUTED, align: 'right' });
    page.text(RIGHT, right, v, { size: 9, bold: true, color: INK, align: 'right' });
    right -= 13;
  }
  y = Math.min(left, right) - 22;

  // Billing and delivery address.
  page.line(M, y + 8, RIGHT, y + 8);
  y -= 10;
  page.text(M, y, 'BILL TO', { size: 8.5, bold: true, color: MUTED });
  y -= 15;
  page.text(M, y, order.full_name, { size: 10.5, bold: true, color: INK });
  y -= 14;
  for (const l of [order.line1, order.line2, `${order.postcode} ${order.city}`, 'Portugal', order.email, order.phone].filter(Boolean)) {
    page.text(M, y, fit(l, 300, 9.5), { size: 9.5, color: INK });
    y -= 13;
  }
  y -= 18;

  // Items.
  tableHeader();
  for (const it of items) {
    const rowHeight = it.variant ? 36 : 26;
    if (y - rowHeight < 150) newPage(false);
    page.text(M + 8, y, fit(it.name, COL.qty - M - 60, 10, true), { size: 10, bold: true, color: INK });
    if (it.variant) page.text(M + 8, y - 12, fit(it.variant, COL.qty - M - 60, 8.5), { size: 8.5, color: MUTED });
    page.text(COL.qty, y, String(it.qty), { size: 10, color: INK, align: 'right' });
    page.text(COL.unit, y, eur(it.price_pence), { size: 10, color: INK, align: 'right' });
    page.text(COL.total - 8, y, eur(it.price_pence * it.qty), { size: 10, color: INK, align: 'right' });
    y -= rowHeight;
    page.line(M, y + 12, RIGHT, y + 12, { color: [0.9, 0.9, 0.9] });
  }

  // Totals.
  if (y < 150) newPage(false);
  y -= 8;
  const total = (name: string, value: string, strong = false) => {
    page.text(COL.unit, y, name, { size: strong ? 11 : 9.5, bold: strong, color: strong ? INK : MUTED, align: 'right' });
    page.text(COL.total - 8, y, value, { size: strong ? 11 : 9.5, bold: strong, color: INK, align: 'right' });
    y -= strong ? 20 : 15;
  };
  total('Subtotal', eur(order.subtotal_pence));
  total(`Delivery${order.city ? ` (${order.city})` : ''}`, order.delivery_pence ? eur(order.delivery_pence) : 'Free');
  page.line(COL.qty - 40, y + 9, RIGHT, y + 9, { color: INK, width: 0.8 });
  y -= 4;
  total('Total', eur(order.total_pence), true);

  y -= 10;
  page.text(M, y, `Payment method: ${fit(order.payment_method, 380, 9.5)}`, { size: 9.5, color: INK });
  if (order.tracking_number) page.text(M, y - 14, `Tracking number: ${order.tracking_number}`, { size: 9.5, color: INK });

  // Footer on every page.
  pages.forEach((p, i) => {
    p.line(M, 78, RIGHT, 78);
    p.text(M, 62, 'Thank you for shopping with us. Prices include VAT (IVA) at the applicable rate.', { size: 8.5, color: MUTED });
    p.text(M, 50, 'This document confirms your order and is not a substitute for a tax invoice (fatura) issued by certified software.', { size: 7.5, color: MUTED });
    p.text(RIGHT, 62, `Page ${i + 1} of ${pages.length}`, { size: 8.5, color: MUTED, align: 'right' });
  });

  return renderPdf(pages, `Invoice ${order.order_number}`);
}

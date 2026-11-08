import { all } from './db.ts';
import { settings } from './store.ts';
import { parseColours, parseOptions } from './helpers.ts';
import type { CartEntry, SessionData } from './types.ts';

const MAX_LINES = 30;
export const MAX_QTY = 10;

/*
 * The session only stores { productId, colour, option, qty }. Names, prices and stock are
 * always re-read from the database, so a tampered session can never change what is charged.
 */
const lineKey = (productId: number, colour: string, option: string) => `${productId}|${colour}|${option}`;

function getRaw(session: SessionData): CartEntry[] {
  if (!Array.isArray(session.cart)) session.cart = [];
  return session.cart;
}

interface AddableProduct { id: number; colours: string; options: string }

export function add(session: SessionData, product: AddableProduct, input: { colour?: string; option?: string; qty?: number }) {
  const cart = getRaw(session);
  let { colour = '', option = '' } = input;
  const qty = input.qty ?? 1;
  // Only accept variants that actually exist on the product.
  const colours = parseColours(product.colours).map((c) => c.name);
  const options = parseOptions(product.options).map((o) => o.name);
  if (colours.length && !colours.includes(colour)) colour = colours[0];
  if (!colours.length) colour = '';
  if (options.length && !options.includes(option)) option = options[0];
  if (!options.length) option = '';

  const key = lineKey(product.id, colour, option);
  const existing = cart.find((l) => lineKey(l.productId, l.colour, l.option) === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else if (cart.length < MAX_LINES) cart.push({ productId: product.id, colour, option, qty: Math.min(MAX_QTY, qty) });
}

export function update(session: SessionData, index: number, qty: number) {
  const cart = getRaw(session);
  if (!cart[index]) return;
  if (qty <= 0) cart.splice(index, 1);
  else cart[index].qty = Math.min(MAX_QTY, qty);
}

export function clear(session: SessionData) {
  session.cart = [];
}

interface CartProduct {
  id: number; name: string; name_pt: string; slug: string; price_pence: number; stock: number;
  colours: string; options: string; brand: string; thumb: string | null;
}

export interface CartLine {
  product: CartProduct;
  colour: string;
  option: string;
  variant: string;
  qty: number;
  unit: number;
  lineTotal: number;
  inStock: boolean;
}

export interface CartSummary {
  lines: CartLine[];
  count: number;
  subtotal: number;
  delivery: number;
  total: number;
  freeDeliveryRemaining: number;
}

/** Resolve the session cart against the database and compute totals. */
export function summary(session: SessionData | null | undefined): CartSummary {
  const raw = session ? getRaw(session) : [];
  if (!raw.length) return { lines: [], count: 0, subtotal: 0, delivery: 0, total: 0, freeDeliveryRemaining: 0 };

  const ids = [...new Set(raw.map((l) => Number(l.productId)).filter(Number.isInteger))];
  const products = new Map(
    all<CartProduct>(`SELECT p.id, p.name, p.name_pt, p.slug, p.price_pence, p.stock, p.colours, p.options, p.brand,
           (SELECT i.thumb FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS thumb
         FROM products p WHERE p.is_active = 1 AND p.id IN (${ids.map(() => '?').join(',')})`, ...ids)
      .map((p) => [p.id, p]),
  );

  const lines: CartLine[] = [];
  const kept: CartEntry[] = [];
  for (const l of raw) {
    const p = products.get(Number(l.productId));
    if (!p) continue; // product removed or hidden since it was added
    const opt = parseOptions(p.options).find((o) => o.name === l.option);
    const unit = p.price_pence + (opt ? opt.extraPence : 0);
    const qty = Math.max(1, Math.min(MAX_QTY, Number(l.qty) || 1));
    kept.push(l);
    lines.push({
      product: p,
      colour: l.colour,
      option: l.option,
      variant: [l.option, l.colour].filter(Boolean).join(' - '),
      qty,
      unit,
      lineTotal: unit * qty,
      inStock: p.stock >= qty,
    });
  }
  session!.cart = kept;

  const s = settings();
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const free = s.freeDeliveryPence > 0 && subtotal >= s.freeDeliveryPence;
  const delivery = subtotal === 0 || free ? 0 : s.deliveryFeePence;
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    delivery,
    total: subtotal + delivery,
    freeDeliveryRemaining: free || !s.freeDeliveryPence ? 0 : s.freeDeliveryPence - subtotal,
  };
}

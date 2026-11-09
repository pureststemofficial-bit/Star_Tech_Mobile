import { fromPence, toPence } from './format.ts';
import type { Db } from './db.ts';

/*
 * The store moved from pounds to euros. This converts a database's existing amounts once; the
 * demo catalogue in seed.ts is still written in pounds and is converted here too. Amount columns
 * keep their `_pence` names but now hold euro cents.
 */
export const EUR_PER_GBP = 1.1986; // European Central Bank reference rate, 9 November 2026

const euro = (pence: number) => Math.round(pence * EUR_PER_GBP);

/** Option lines hold their extra cost as text: "256GB|+100". */
export const euroOptions = (text: string) =>
  text.split('\n').map((line) => {
    const [name, extra] = line.split('|');
    const pence = extra ? toPence(extra.replace(/[+£]/g, '')) : null;
    return pence ? `${name}|+${fromPence(euro(pence))}` : line;
  }).join('\n');

/** Amounts written in shop text, in either language's style. */
export const euroText = (text: string) =>
  text
    .replace(/£\s?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g, (_, n: string) => `€${(euro(Number(n.replace(/,/g, '')) * 100) / 100).toFixed(2)}`)
    .replace(/(\d+(?:,\d{1,2})?)\s?£/g, (_, n: string) => `${(euro(Number(n.replace(',', '.')) * 100) / 100).toFixed(2).replace('.', ',')} €`)
    .replace(/pounds sterling \(GBP\)|libras esterlinas \(GBP\)/g, 'euros (EUR)');

/** Run inside a transaction. Order totals are rebuilt from their lines so they still add up. */
export function convertToEuro({ all, run }: Pick<Db, 'all' | 'run'>) {
  const rounded = (column: string) => `${column} = CAST(ROUND(${column} * ${EUR_PER_GBP}) AS INTEGER)`;
  run(`UPDATE products SET ${rounded('price_pence')}, ${rounded('compare_pence')}`);
  for (const p of all<{ id: number; options: string }>("SELECT id, options FROM products WHERE options LIKE '%|%'")) {
    run('UPDATE products SET options = ? WHERE id = ?', euroOptions(p.options), p.id);
  }
  run(`UPDATE order_items SET ${rounded('price_pence')}`);
  run(`UPDATE orders SET ${rounded('delivery_pence')},
         subtotal_pence = COALESCE((SELECT SUM(i.price_pence * i.qty) FROM order_items i WHERE i.order_id = orders.id), CAST(ROUND(subtotal_pence * ${EUR_PER_GBP}) AS INTEGER))`);
  run('UPDATE orders SET total_pence = subtotal_pence + delivery_pence');
  run(`UPDATE repairs SET ${rounded('quote_pence')}`);

  for (const s of all<{ key: string; value: string }>('SELECT key, value FROM settings')) {
    const value = s.key.endsWith('_pence') ? String(euro(Number(s.value) || 0)) : euroText(s.value);
    if (value !== s.value) run('UPDATE settings SET value = ? WHERE key = ?', value, s.key);
  }
  for (const p of all<{ slug: string; body: string; body_pt: string }>('SELECT slug, body, body_pt FROM pages')) {
    run('UPDATE pages SET body = ?, body_pt = ? WHERE slug = ?', euroText(p.body), euroText(p.body_pt), p.slug);
  }
}

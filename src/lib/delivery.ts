import { all, get } from './db.ts';
import { settings } from './store.ts';

/* Delivery charges by city, set in Admin -> Delivery. A city without its own charge uses the default. */

export interface DeliveryCity {
  id: number;
  name: string;
  district: string;
  fee_pence: number | null;
}

export const deliveryCities = () =>
  all<DeliveryCity>('SELECT id, name, district, fee_pence FROM delivery_cities ORDER BY sort_order, name');

/** Cities grouped by district, in list order. */
export function citiesByDistrict() {
  const groups = new Map<string, DeliveryCity[]>();
  for (const c of deliveryCities()) groups.set(c.district, [...(groups.get(c.district) ?? []), c]);
  return [...groups].map(([district, cities]) => ({ district, cities }));
}

/** The charge for delivering to `city`, or undefined if it isn't one of the listed cities. */
export function cityFee(city: string): number | undefined {
  const row = get<{ fee_pence: number | null }>('SELECT fee_pence FROM delivery_cities WHERE name = ?', city);
  if (!row) return undefined;
  return row.fee_pence ?? settings().deliveryFeePence;
}

/** The listed city matching a saved address (ignoring case and accents), for pre-filling checkout. */
export function matchCity(value: string | undefined) {
  const key = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  if (!value) return '';
  const wanted = key(value);
  return deliveryCities().find((c) => key(c.name) === wanted)?.name ?? '';
}

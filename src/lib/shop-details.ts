import type { Db } from './db.ts';

/* The shop's real contact details. These are the defaults; Admin -> Settings can override them. */
export const SHOP_DETAILS = {
  phone: '00351 219 538 158',
  email: 'startech.lda@gmail.com',
  address: 'Rua da Republica Número 37 41\n2625-144 Povoa de Santa Iria\nPortugal',
  map_query: 'Rua da Republica 37, 2625-144 Povoa de Santa Iria, Portugal',
};

const DEMO_DETAILS: typeof SHOP_DETAILS = {
  phone: '+44 20 7123 4567',
  email: 'info@startechmobile.co.uk',
  address: '123 High Street\nLondon, E1 6AN\nUnited Kingdom',
  map_query: '123 High Street, London E1 6AN',
};

/** Replace the demo details in an existing database. Anything the admin has typed is left alone. */
export function applyShopDetails({ run }: Pick<Db, 'run'>) {
  for (const key of Object.keys(SHOP_DETAILS) as (keyof typeof SHOP_DETAILS)[]) {
    run('UPDATE settings SET value = ? WHERE key = ? AND value = ?', SHOP_DETAILS[key], key, DEMO_DETAILS[key]);
  }
  run('UPDATE pages SET body = replace(body, ?, ?), body_pt = replace(body_pt, ?, ?)',
    'our London store', 'our Povoa de Santa Iria store',
    'nossa loja de Londres', 'nossa loja da Povoa de Santa Iria');
}

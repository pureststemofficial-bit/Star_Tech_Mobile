import type { Db } from './db.ts';

/* The shop's real contact details. These are the defaults; Admin -> Settings can override them. */
export const SHOP_DETAILS = {
  phone: '00351 219 538 158',
  email: 'startech.lda@gmail.com',
  address: 'Rua da República, n.º 37-41\n2625-144 Póvoa de Santa Iria\nPortugal',
  map_query: 'Rua da República 37, 2625-144 Póvoa de Santa Iria, Portugal',
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
    'our London store', 'our Póvoa de Santa Iria store',
    'nossa loja de Londres', 'nossa loja da Póvoa de Santa Iria');
}

/* The shop trades in Portugal: old wording that said it was in the UK, and what replaces it. */
const SETTINGS_TEXT: [string, string][] = [
  ['UK Based · Fast Delivery', 'Based in Portugal · Fast Delivery'],
  ['Free UK Delivery|', 'Free Delivery in Portugal|'],
  ['Cash on delivery (London only)', 'Cash on delivery (Lisbon area only)'],
  ['UK based with fast delivery.', 'Based in Portugal with fast delivery.'],
  ['Sediados no Reino Unido', 'Sediados em Portugal'],
  ['Entrega grátis no Reino Unido|', 'Entrega grátis em Portugal|'],
  ['(apenas Londres)', '(apenas na zona de Lisboa)'],
  ['Sediada no Reino Unido', 'Sediada em Portugal'],
];
const PAGE_TEXT: [string, string][] = [
  ['Your Trusted Tech Partner in the UK', 'Your Trusted Tech Partner in Portugal'],
  ['is a UK based electronics store', 'is an electronics store based in Portugal'],
  ['We deliver across the UK.', 'We deliver across Portugal.'],
  ['Under UK GDPR you', 'Under the GDPR you'],
  ['Fast UK delivery', 'Fast delivery in Portugal'],
  ['confiança no Reino Unido', 'confiança em Portugal'],
  ['sediada no Reino Unido,', 'sediada em Portugal,'],
  ['Entregamos em todo o Reino Unido.', 'Entregamos em todo o território de Portugal.'],
  ['Ao abrigo do UK GDPR,', 'Ao abrigo do RGPD,'],
  ['Entrega rápida no Reino Unido', 'Entrega rápida em Portugal'],
];
const PRODUCT_TEXT: [string, string][] = [
  ['with fast UK delivery,', 'with fast delivery in Portugal,'],
  ['entrega rápida no Reino Unido,', 'entrega rápida em Portugal,'],
];

/* Spelling and grammar corrections to the original copy, in English and Portuguese. */
const WORDING: Record<string, [string, string][]> = {
  'settings.value': [
    ['Encrypted end to end', 'Encrypted end-to-end'],
    ['14-Day Returns|Hassle free', '14-Day Returns|Hassle-free'],
    ['Reparação da entrada de carga', 'Reparação da entrada de carregamento'],
    ['Rua da Republica Número 37 41', 'Rua da República, n.º 37-41'],
    ['Rua da Republica 37', 'Rua da República 37'],
    ['Povoa de Santa Iria', 'Póvoa de Santa Iria'],
  ],
  'pages.body': [
    ['every day, using quality parts and backed by our repair warranty.', 'every day using quality parts, and every repair is backed by our warranty.'],
    ['Povoa de Santa Iria', 'Póvoa de Santa Iria'],
  ],
  'pages.body_pt': [
    ['consolas, com peças de qualidade e a garantia das nossas reparações.', 'consolas com peças de qualidade, e todas as reparações têm garantia.'],
    ['Povoa de Santa Iria', 'Póvoa de Santa Iria'],
  ],
  'products.specs': [['Warranty: 1 year manufacturer', 'Warranty: 1 year (manufacturer)']],
  'products.specs_pt': [['Garantia: 1 ano do fabricante', 'Garantia: 1 ano (fabricante)'], ['Estojo de carga:', 'Estojo de carregamento:']],
  'blog_posts.body_pt': [
    ['Os conectores USB-C são todos iguais, mas', 'Os conectores USB-C parecem todos iguais, mas'],
    ['baterias e entradas de carga na loja.', 'baterias e entradas de carregamento na loja.'],
  ],
};

/** Apply the wording corrections to an existing database. Only these exact phrases change. */
export function applyWording({ run }: Pick<Db, 'run'>) {
  for (const [target, pairs] of Object.entries(WORDING)) {
    const [table, col] = target.split('.');
    for (const [from, to] of pairs) run(`UPDATE ${table} SET ${col} = replace(${col}, ?, ?)`, from, to);
  }
}

/* Free delivery was withdrawn: every order now pays the delivery fee. */
const NO_FREE_DELIVERY: [string, string][] = [
  ['Free on orders over €59.93. Otherwise a small delivery charge applies, shown at checkout.',
    'A delivery charge applies to every order and is shown at checkout.'],
  ['Grátis em encomendas acima de 59,93 €. Caso contrário, aplica-se uma pequena taxa de entrega, indicada na finalização da compra.',
    'Aplica-se uma taxa de entrega a todas as encomendas, indicada na finalização da compra.'],
  ['Free Delivery in Portugal|On orders over €59.93', 'Fast Delivery in Portugal|Same-day dispatch before 2pm'],
  ['Entrega grátis em Portugal|Em encomendas acima de 59,93 €', 'Entrega rápida em Portugal|Expedição no próprio dia até às 14h'],
];

/** Turn off free delivery in an existing database and drop the copy that promised it. */
export function removeFreeDelivery({ run }: Pick<Db, 'run'>) {
  run("UPDATE settings SET value = '0' WHERE key = 'free_delivery_pence'");
  for (const [from, to] of NO_FREE_DELIVERY) {
    run('UPDATE settings SET value = replace(value, ?, ?)', from, to);
    run('UPDATE pages SET body = replace(body, ?, ?), body_pt = replace(body_pt, ?, ?)', from, to, from, to);
  }
}

/** Rewrite the UK wording in an existing database. Only these exact phrases change. */
export function applyPortugal({ run }: Pick<Db, 'run'>) {
  for (const [from, to] of SETTINGS_TEXT) run('UPDATE settings SET value = replace(value, ?, ?)', from, to);
  for (const [from, to] of PAGE_TEXT) {
    for (const col of ['title', 'subtitle', 'body', 'title_pt', 'subtitle_pt', 'body_pt']) {
      run(`UPDATE pages SET ${col} = replace(${col}, ?, ?)`, from, to);
    }
  }
  for (const [from, to] of PRODUCT_TEXT) {
    run('UPDATE products SET description = replace(description, ?, ?), description_pt = replace(description_pt, ?, ?)', from, to, from, to);
  }
}

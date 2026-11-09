import { all, run, tx } from './db.ts';
import { CARD_METHOD, stripeEnabled } from './config.ts';
import { lines } from './helpers.ts';
import type { Locale } from './i18n/config.ts';
import type { Category } from './types.ts';

/* Site-wide editable settings. Defaults are used until the admin changes them. */
const BASE = {
  site_name: 'Startech Mobile',
  tagline: 'Your Tech. Our Priority.',
  announcement: 'UK Based · Fast Delivery · Expert Repairs',
  hero_title: 'The tech you want.\nThe care it deserves.',
  hero_subtitle: 'Phones, laptops, gaming and accessories from the brands you trust, with expert repairs whenever you need them.',
  hero_button_text: 'Shop the collection',
  hero_button_link: '/shop',
  hero_image: '/img/photos/hero.webp',
  shop_title: 'All Products',
  shop_subtitle: 'Find the best tech products at great prices.',
  repair_title: 'Book a Repair',
  repair_subtitle: 'Fast. Reliable. Professional.',
  repair_text: 'Get your device back in perfect working order.',
  repair_device_types: 'Mobile Phone\nTablet\nLaptop\nGames Console\nSmartwatch\nOther',
  repair_brands: 'Apple\nSamsung\nGoogle\nOnePlus\nXiaomi\nSony\nMicrosoft\nNintendo\nDell\nHP\nLenovo\nOther',
  repair_types: 'Screen Replacement\nBattery Replacement\nCharging Port Repair\nSoftware / Diagnostics\nWater Damage\nOther',
  repair_times: '09:00 - 11:00\n11:00 - 13:00\n13:00 - 15:00\n15:00 - 17:00\n17:00 - 19:00',
  features: 'Free UK Delivery|On orders over £50\nSecure Checkout|Encrypted end to end\n14-Day Returns|Hassle free\nExpert Support|Here to help',
  phone: '+44 20 7123 4567',
  email: 'info@startechmobile.co.uk',
  address: '123 High Street\nLondon, E1 6AN\nUnited Kingdom',
  hours: 'Mon - Sat: 9:00 AM - 7:00 PM\nSun: 10:00 AM - 5:00 PM',
  map_query: '123 High Street, London E1 6AN',
  // Blank hides the icon: add your real profile links in Admin -> Settings.
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  social_youtube: '',
  free_delivery_pence: '5000',
  delivery_fee_pence: '499',
  payment_methods: 'Bank transfer (details emailed after ordering)\nPay on collection in store (card or cash)\nCash on delivery (London only)',
  meta_description: 'Startech Mobile – latest phones, accessories, gaming, laptops and expert repairs. UK based with fast delivery.',
};

/** Portuguese defaults. Each is also editable, as `<key>_pt`, in Admin -> Settings. */
const PORTUGUESE = {
  tagline_pt: 'A sua tecnologia. A nossa prioridade.',
  announcement_pt: 'Sediados no Reino Unido · Entrega rápida · Reparações especializadas',
  hero_title_pt: 'A tecnologia que quer.\nO cuidado que merece.',
  hero_subtitle_pt: 'Telemóveis, portáteis, gaming e acessórios das marcas em que confia, com reparações especializadas sempre que precisar.',
  hero_button_text_pt: 'Ver a coleção',
  shop_title_pt: 'Todos os produtos',
  shop_subtitle_pt: 'Encontre os melhores produtos de tecnologia a ótimos preços.',
  repair_title_pt: 'Marcar uma reparação',
  repair_subtitle_pt: 'Rápido. Fiável. Profissional.',
  repair_text_pt: 'Receba o seu equipamento de volta em perfeito estado.',
  repair_device_types_pt: 'Telemóvel\nTablet\nPortátil\nConsola de jogos\nSmartwatch\nOutro',
  repair_types_pt: 'Substituição de ecrã\nSubstituição de bateria\nReparação da entrada de carga\nSoftware / Diagnóstico\nDanos causados por água\nOutro',
  features_pt: 'Entrega grátis no Reino Unido|Em encomendas acima de 50 £\nPagamento seguro|Encriptado do início ao fim\nDevoluções em 14 dias|Sem complicações\nApoio especializado|Sempre ao seu dispor',
  hours_pt: 'Seg. a sáb.: 9h00 - 19h00\nDom.: 10h00 - 17h00',
  payment_methods_pt: 'Transferência bancária (dados enviados por email após a encomenda)\nPagamento no levantamento em loja (cartão ou numerário)\nPagamento na entrega (apenas Londres)',
  meta_description_pt: 'Startech Mobile – os mais recentes telemóveis, acessórios, gaming, portáteis e reparações especializadas. Sediada no Reino Unido, com entrega rápida.',
};

export const DEFAULTS = { ...BASE, ...PORTUGUESE };

export type SettingKey = keyof typeof DEFAULTS;
export type Settings = Record<SettingKey, string> & {
  featureList: { title: string; sub: string }[];
  freeDeliveryPence: number;
  deliveryFeePence: number;
};

// Cached on globalThis so every module instance (pages, Server Actions) shares one cache.
type Cache = { settings: Settings | null; categories: Category[] | null };
const g = globalThis as typeof globalThis & { __startechStore?: Cache };
const cache: Cache = (g.__startechStore ??= { settings: null, categories: null });

export const isSettingKey = (k: string): k is SettingKey => Object.hasOwn(DEFAULTS, k);

const parseFeatures = (text: string) =>
  lines(text).map((l) => {
    const [title, sub] = l.split('|');
    return { title: (title || '').trim(), sub: (sub || '').trim() };
  });

export function settings(): Settings {
  if (!cache.settings) {
    const values: Record<SettingKey, string> = { ...DEFAULTS };
    for (const row of all<{ key: string; value: string }>('SELECT key, value FROM settings')) {
      if (isSettingKey(row.key)) values[row.key] = row.value;
    }
    // Still on the original demo artwork? Use the photograph instead.
    if (values.hero_image === '/img/hero.svg') values.hero_image = DEFAULTS.hero_image;
    cache.settings = {
      ...values,
      featureList: parseFeatures(values.features),
      freeDeliveryPence: Number(values.free_delivery_pence) || 0,
      deliveryFeePence: Number(values.delivery_fee_pence) || 0,
    };
  }
  return cache.settings;
}

/** Settings as the visitor should read them: each text swapped for its translation when one exists. */
export function localizedSettings(locale: Locale): Settings {
  const s = settings();
  if (locale === 'en') return s;
  const out: Settings = { ...s };
  for (const key of Object.keys(PORTUGUESE) as (keyof typeof PORTUGUESE)[]) {
    const base = key.slice(0, -3) as SettingKey;
    if (s[key].trim()) out[base] = s[key];
  }
  out.featureList = parseFeatures(out.features);
  return out;
}

/**
 * Pairs a list setting with its translation by line. `value` is always the English line, which is
 * what forms submit and what the admin sees; `label` is what the visitor reads. If the two lists
 * have different lengths the English text is shown rather than risk mismatching them.
 */
export function localizedOptions(key: 'repair_device_types' | 'repair_types' | 'payment_methods', locale: Locale) {
  const s = settings();
  const values = lines(s[key]);
  const translated = lines(s[`${key}_pt`]);
  const usable = locale !== 'en' && translated.length === values.length;
  const options = values.map((value, i) => ({ value, label: usable ? translated[i] : value }));
  if (key === 'payment_methods' && stripeEnabled()) {
    options.unshift({ value: CARD_METHOD, label: locale === 'pt' ? 'Cartão (pagamento seguro via Stripe)' : CARD_METHOD });
  }
  return options;
}

/** The stored (English) payment method in the visitor's language, for showing on an order. */
export function paymentLabel(stored: string, locale: Locale) {
  return localizedOptions('payment_methods', locale).find((m) => m.value === stored)?.label ?? stored;
}

export function saveSettings(values: Partial<Record<SettingKey, string>>) {
  tx(() => {
    for (const [key, value] of Object.entries(values)) {
      if (!isSettingKey(key) || value === undefined) continue;
      run(`INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, String(value));
    }
  });
  cache.settings = null;
}

export function categories(): Category[] {
  if (!cache.categories) {
    cache.categories = all<Category>(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
      FROM categories c ORDER BY c.sort_order, c.name`);
  }
  return cache.categories;
}

export function invalidate() {
  cache.settings = null;
  cache.categories = null;
}

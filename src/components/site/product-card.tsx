import Link from 'next/link';
import { Price, Stars } from './bits';
import { AddToCartButton } from './add-to-cart';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import type { CardProduct } from '@/lib/types';

export async function ProductCard({ p }: { p: CardProduct }) {
  const { t, locale } = await getI18n();
  const name = pick(p, 'name', locale);
  const discount = p.compare_pence > p.price_pence ? Math.round(100 - (p.price_pence / p.compare_pence) * 100) : 0;
  return (
    <article className="tile group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-muted">
        <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true" className="block size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumb || '/img/products/placeholder.svg'} alt="" width={520} height={520} loading="lazy" decoding="async" className="tile-img size-full object-cover" />
        </Link>
        {discount ? <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white tabular-nums">-{discount}%</span> : null}
        {p.stock > 0 ? (
          <div className="absolute right-3 bottom-3">
            <AddToCartButton productId={p.id} name={name} />
          </div>
        ) : (
          <span className="absolute right-3 bottom-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-destructive">{t('stock.out')}</span>
        )}
      </div>
      <p className="eyebrow mt-3.5 text-[11px] text-muted-foreground">{p.brand}</p>
      <h3 className="mt-1 line-clamp-2 text-[15px] leading-snug">
        <Link href={`/product/${p.slug}`} className="link-grow focus-visible:underline">{name}</Link>
      </h3>
      {p.review_count ? <Stars rating={p.rating ?? 0} count={p.review_count} className="mt-1.5" /> : null}
      <div className="mt-1.5"><Price price={p.price_pence} compare={p.compare_pence} /></div>
    </article>
  );
}

export function ProductGrid({ products, cols = 4 }: { products: CardProduct[]; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 ${cols === 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {products.map((p) => <div key={p.id} className="reveal"><ProductCard p={p} /></div>)}
    </div>
  );
}

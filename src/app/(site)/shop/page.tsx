import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/site/container';
import { PageBanner } from '@/components/site/bits';
import { ProductGrid } from '@/components/site/product-card';
import { Pagination } from '@/components/site/pagination';
import { ShopFilters, SortSelect } from '@/components/shop/filters';
import { localizedSettings, categories } from '@/lib/store';
import { search, brandCounts, PRICE_RANGES, SORT_KEYS } from '@/lib/catalog';
import { str, int, oneOf } from '@/lib/validate';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';

type SP = Promise<Record<string, string | string[] | undefined>>;

const asArray = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((x) => str(x, 80)).filter(Boolean).slice(0, 20);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const q = str(sp.q, 100);
  const cat = categories().find((c) => asArray(sp.category).length === 1 && c.slug === asArray(sp.category)[0]);
  return { title: q ? t('shop.search', { q }) : cat ? pick(cat, 'name', locale) : t('shop.all') };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { t, locale, money } = await getI18n();
  const site = localizedSettings(locale);
  const cats = categories();
  const selectedCats = asArray(sp.category);
  const filters = {
    q: str(sp.q, 100),
    categoryIds: cats.filter((c) => selectedCats.includes(c.slug)).map((c) => c.id),
    brands: asArray(sp.brand),
    prices: asArray(sp.price),
    sort: oneOf(sp.sort, SORT_KEYS, 'popular'),
    page: int(sp.page, { min: 1, max: 1000, fallback: 1 }),
  };
  const result = search(filters);
  const activeCat = selectedCats.length === 1 ? cats.find((c) => c.slug === selectedCats[0]) : undefined;
  const hidden: [string, string][] = [
    ...(filters.q ? [['q', filters.q] as [string, string]] : []),
    ...selectedCats.map((v) => ['category', v] as [string, string]),
    ...filters.prices.map((v) => ['price', v] as [string, string]),
    ...filters.brands.map((v) => ['brand', v] as [string, string]),
  ];
  const first = result.total ? (result.page - 1) * result.perPage + 1 : 0;
  const last = Math.min(result.page * result.perPage, result.total);
  const priceRanges = PRICE_RANGES.map((r) => ({
    id: r.id,
    label: r.max === null ? `${money(r.min).replace(/[.,]00/, '')}+` : `${money(r.min).replace(/[.,]00/, '')} – ${money(r.max).replace(/[.,]00/, '')}`,
  }));

  return (
    <>
      <PageBanner
        image="/img/photos/shop.webp"
        title={activeCat ? pick(activeCat, 'name', locale) : filters.q ? t('shop.results', { q: filters.q }) : site.shop_title}
        subtitle={site.shop_subtitle}
      />
      <Container className="mt-10 grid items-start grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <ShopFilters
          q={filters.q}
          sort={filters.sort}
          selected={{ categories: selectedCats, prices: filters.prices, brands: filters.brands }}
          categories={cats.map((c) => ({ slug: c.slug, name: pick(c, 'name', locale), product_count: c.product_count }))}
          priceRanges={priceRanges}
          brands={brandCounts()}
        />
        <div>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground" aria-live="polite">{t('shop.showing', { first, last, total: result.total })}</span>
            <SortSelect sort={filters.sort} hidden={hidden} />
          </div>
          {result.items.length ? (
            <>
              <ProductGrid products={result.items} cols={3} />
              <Pagination
                page={result.page}
                pages={result.pages}
                base="/shop"
                params={{ q: filters.q, category: selectedCats, price: filters.prices, brand: filters.brands, sort: filters.sort }}
              />
            </>
          ) : (
            <div className="py-20 text-center">
              <h2 className="font-display text-4xl">{t('shop.empty')}</h2>
              <p className="mt-2 mb-6 text-muted-foreground">{t('shop.emptyBody')}</p>
              <Button asChild variant="ink"><Link href="/shop">{t('shop.viewAll')}</Link></Button>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}

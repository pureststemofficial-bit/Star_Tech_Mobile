import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Heart, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Container } from '@/components/site/container';
import { SectionHeading, Stars } from '@/components/site/bits';
import { ProductGrid } from '@/components/site/product-card';
import { Gallery } from '@/components/product/gallery';
import { BuyBox } from '@/components/product/buy-box';
import { ReviewForm } from '@/components/product/review-form';
import { get, all } from '@/lib/db';
import { related } from '@/lib/catalog';
import { settings } from '@/lib/store';
import { currentUser } from '@/lib/auth';
import { toggleWishlist } from '@/actions/shop';
import { lines, parseColours, parseOptions, parseSpecs } from '@/lib/format';
import { str } from '@/lib/validate';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import type { Product, Review } from '@/lib/types';

type Params = Promise<{ slug: string }>;
type ProductRow = Product & { category_name: string | null; category_name_pt: string | null; category_slug: string | null };

function loadProduct(slug: string) {
  return get<ProductRow>(`SELECT p.*, c.name AS category_name, c.name_pt AS category_name_pt, c.slug AS category_slug
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.is_active = 1`, str(slug, 120));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = loadProduct((await params).slug);
  const { t, locale } = await getI18n();
  if (!product) return { title: t('product.notFound') };
  const first = get<{ path: string }>('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1', product.id);
  return {
    title: pick(product, 'name', locale),
    description: pick(product, 'short_desc', locale),
    openGraph: first ? { images: [{ url: first.path }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = loadProduct(slug);
  if (!product) notFound();

  const { t, locale, money, date } = await getI18n();
  const user = await currentUser();
  const name = pick(product, 'name', locale);
  const images = all<{ path: string; thumb: string }>('SELECT path, thumb FROM product_images WHERE product_id = ? ORDER BY sort_order, id', product.id);
  const reviews = all<Review>('SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY id DESC LIMIT 50', product.id);
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const inWishlist = user ? !!get('SELECT 1 AS x FROM wishlist WHERE user_id = ? AND product_id = ?', user.id, product.id) : false;
  const specs = parseSpecs(pick(product, 'specs', locale));
  const features = lines(pick(product, 'features', locale));
  const site = settings();
  const categoryName = locale === 'pt' && product.category_name_pt ? product.category_name_pt : product.category_name;
  const rel = related(product, 4);

  // Lets search engines show price and availability. JSON.stringify output is safe once "<" is escaped.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: pick(product, 'short_desc', locale),
    brand: { '@type': 'Brand', name: product.brand },
    image: images.map((i) => i.path),
    ...(reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.toFixed(1), reviewCount: reviews.length } } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (product.price_pence / 100).toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }).replace(/</g, '\\u003c');

  return (
    <Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label={t('product.breadcrumb')} className="flex flex-wrap items-center gap-1.5 py-5 text-[13px] text-muted-foreground">
        <Link href="/" className="link-grow py-1">{t('product.home')}</Link><span aria-hidden="true">/</span>
        {product.category_slug ? (
          <><Link href={`/shop?category=${product.category_slug}`} className="link-grow py-1">{categoryName}</Link><span aria-hidden="true">/</span></>
        ) : null}
        <span aria-current="page" className="text-foreground">{name}</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
        <Gallery name={name} images={images} />

        <div className="grid content-start gap-6 lg:py-4">
          <div>
            <p className="eyebrow mb-3 text-muted-foreground">{product.brand}</p>
            <h1 className="font-display text-[clamp(2.75rem,5vw,4.25rem)] leading-[1.02]">{name}</h1>
            {reviews.length ? (
              <a href="#details" className="mt-3 inline-flex items-center gap-2 py-1 text-sm">
                <Stars rating={rating} /> <span className="text-muted-foreground">{t('product.reviewsCount', { rating: rating.toFixed(1), n: reviews.length })}</span>
              </a>
            ) : null}
            <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">{pick(product, 'short_desc', locale)}</p>
          </div>

          <div>
            {product.stock <= 0 ? <Badge variant="destructive">{t('product.outOfStock')}</Badge>
              : product.stock < 5 ? <Badge variant="warning">{t('product.onlyLeft', { n: product.stock })}</Badge>
              : <Badge variant="success"><Check /> {t('product.inStock')}</Badge>}
          </div>

          <BuyBox
            productId={product.id}
            basePrice={product.price_pence}
            comparePrice={product.compare_pence}
            inStock={product.stock > 0}
            colours={parseColours(product.colours)}
            options={parseOptions(product.options)}
          />

          <form action={toggleWishlist} className="-mt-2 text-center">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="back" value={`/product/${product.slug}`} />
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-sm hover:text-primary">
              <Heart className={inWishlist ? 'size-4 fill-primary text-primary' : 'size-4'} />
              {inWishlist ? t('product.wishlistSaved') : t('product.wishlistAdd')}
            </button>
          </form>

          {features.length ? (
            <ul className="grid gap-2.5 border-t pt-6">
              {features.map((f) => (
                <li key={f} className="flex gap-3 text-[15px]"><Check className="mt-1 size-4 shrink-0 text-primary" />{f}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 border-t pt-6 sm:grid-cols-3">
            {[
              { Icon: Truck, title: t('product.perkDelivery'), sub: t('product.perkDeliverySub', { amount: money(site.freeDeliveryPence) }) },
              { Icon: RotateCcw, title: t('product.perkReturns'), sub: t('product.perkReturnsSub') },
              { Icon: ShieldCheck, title: t('product.perkWarranty'), sub: t('product.perkWarrantySub') },
            ].map(({ Icon, title, sub }) => (
              <div key={title} className="flex gap-2.5 text-xs sm:flex-col">
                <Icon className="size-5 shrink-0 stroke-[1.5] text-primary" aria-hidden="true" />
                <div><strong className="block text-[13px] font-medium">{title}</strong><span className="text-muted-foreground">{sub}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-20" id="details">
        <TabsList>
          <TabsTrigger value="description">{t('product.tabDescription')}</TabsTrigger>
          <TabsTrigger value="specs">{t('product.tabSpecs')}</TabsTrigger>
          <TabsTrigger value="reviews">{t('product.tabReviews', { n: reviews.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="max-w-3xl py-7">
          {pick(product, 'description', locale).split(/\n\s*\n/).map((p, i) => <p key={i} className="mb-4 text-[17px] leading-relaxed text-foreground/85">{p}</p>)}
        </TabsContent>
        <TabsContent value="specs" className="max-w-3xl py-7">
          {specs.length ? (
            <Table>
              <TableBody>
                {specs.map((s) => (
                  <TableRow key={s.key}>
                    <TableHead scope="row" className="w-2/5 font-normal text-muted-foreground normal-case">{s.key}</TableHead>
                    <TableCell className="whitespace-normal">{s.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-muted-foreground">{t('product.noSpecs')}</p>}
        </TabsContent>
        <TabsContent value="reviews" className="grid max-w-3xl gap-5 py-7">
          {!reviews.length ? <p className="text-muted-foreground">{t('product.noReviews')}</p> : null}
          <div className="divide-y">
            {reviews.map((r) => (
              <article key={r.id} className="py-4">
                <header className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <Stars rating={r.rating} /><strong className="font-medium">{r.author}</strong>
                  <span className="text-xs text-muted-foreground">{date(r.created_at)}</span>
                </header>
                <p>{r.body}</p>
              </article>
            ))}
          </div>
          {user ? <ReviewForm productId={product.id} /> : (
            <p><Link className="font-medium text-primary hover:underline" href={`/account/login?next=/product/${product.slug}`}>{t('product.signIn')}</Link> {t('product.signInToReview')}</p>
          )}
        </TabsContent>
      </Tabs>

      {rel.length ? (
        <section className="pt-20">
          <SectionHeading title={t('product.related')} />
          <ProductGrid products={rel} cols={4} />
        </section>
      ) : null}
    </Container>
  );
}

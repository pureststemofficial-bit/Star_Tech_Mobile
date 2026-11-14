import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/site/container';
import { SectionHeading } from '@/components/site/bits';
import { ProductCarousel } from '@/components/site/product-card';
import { Features } from '@/components/site/features';
import { HeroCarousel } from '@/components/site/hero-carousel';
import { heroSlides } from '@/lib/hero';
import { localizedSettings, categories } from '@/lib/store';
import { brandCounts, featured, newArrivals, popular } from '@/lib/catalog';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/*
 * The first category is a 2x2 feature tile; the rest fill single cells. Tiles in an unfinished
 * last row are widened so the grid always ends flush, whatever the admin shows on the home page.
 */
const LG_LAST_ROW = ['', 'lg:col-span-4', 'lg:col-span-2', 'lg:col-span-2'];
function tileSpan(i: number, count: number) {
  if (i === 0) return 'col-span-2 row-span-2';
  const small = count - 1; // tiles after the feature tile
  const fromEnd = small - i; // 0 for the last tile
  const narrow = small % 2 === 1 && fromEnd === 0 ? 'col-span-2 lg:col-span-1' : ''; // 2-column layout
  const lgLeft = small > 4 ? (small - 4) % 4 : 0; // tiles in the last 4-column row, below the feature tile
  const wide = lgLeft === 3 ? fromEnd === 0 : fromEnd < lgLeft; // 3 left: widen only the last one
  return cn(narrow, wide && LG_LAST_ROW[lgLeft]);
}

/* Gradient pairs the brand chips cycle through, so neighbouring brands never share a colour. */
const BRAND_COLOURS = [
  { '--c1': '#5b8cff', '--c2': '#9b6bff' },
  { '--c1': '#ff6fae', '--c2': '#ff9a62' },
  { '--c1': '#3fd9c2', '--c2': '#5bb4ff' },
  { '--c1': '#ffc94a', '--c2': '#ff7a59' },
  { '--c1': '#b98bff', '--c2': '#ff6fd8' },
  { '--c1': '#6be585', '--c2': '#2fc4e0' },
];

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const site = localizedSettings(locale);
  const tiles = categories().filter((c) => c.show_on_home);
  const headline = site.hero_title.split('\n');
  const found = heroSlides();
  const slides = found.length ? found : [site.hero_image]; // empty folder: fall back to the admin's hero photo
  const popularItems = popular(12);
  const newItems = newArrivals(12);
  const brands = brandCounts().map((b) => b.brand).filter((b) => b !== 'Startech');

  return (
    <>
      {/* Hero: banner photos from public/hero_section_img crossfade behind the headline. */}
      <HeroCarousel
        slides={slides}
        labels={{
          region: t('home.heroAria'),
          prev: t('home.heroPrev'),
          next: t('home.heroNext'),
          pause: t('home.heroPause'),
          play: t('home.heroPlay'),
          slide: t('home.heroSlide'),
        }}
      >
        <Container className="py-9 md:py-16">
          <div className="md:max-w-[min(34rem,46%)]">
            <h1 className="font-display text-[clamp(2.5rem,5.6vw,5.5rem)] leading-[0.98]">
              {headline.map((line, i) => (
                <span key={i} className={cn('hero-rise block', i === headline.length - 1 && headline.length > 1 && 'text-primary italic')} style={{ '--i': i } as React.CSSProperties}>{line}</span>
              ))}
            </h1>
            <p className="hero-rise mt-5 text-base leading-relaxed text-ink/75 md:text-lg" style={{ '--i': headline.length } as React.CSSProperties}>{site.hero_subtitle}</p>
            <div className="hero-rise mt-7 flex flex-wrap gap-3 md:mb-10" style={{ '--i': headline.length + 1 } as React.CSSProperties}>
              <Button asChild size="lg" variant="ink"><Link href={site.hero_button_link}>{site.hero_button_text} <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="white"><Link href="/repairs">{t('home.repairsCta')}</Link></Button>
            </div>
          </div>
        </Container>
      </HeroCarousel>

      <Container>
        <div className="border-b py-9"><Features /></div>

        <section className="pt-20">
          <SectionHeading eyebrow={t('home.catEyebrow')} title={t('home.catTitle')} />
          <nav aria-label={t('home.catTitle')} className="grid auto-rows-[46vw] grid-cols-2 gap-3 sm:auto-rows-[260px] sm:gap-4 lg:grid-cols-4">
            {tiles.map((c, i) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`}
                className={cn('tile reveal group relative isolate overflow-hidden rounded-[1.5rem] bg-ink text-white', tileSpan(i, tiles.length))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image || '/img/products/placeholder.svg'} alt="" width={1000} height={1000} loading="lazy" decoding="async" className="tile-img absolute inset-0 -z-20 size-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
                <div className="flex h-full items-end justify-between gap-2 p-4 sm:p-5">
                  <strong className={cn('font-display leading-none font-normal', i === 0 ? 'text-[clamp(2.25rem,4vw,3.5rem)]' : 'text-2xl sm:text-3xl')}>{pick(c, 'nav_label', locale) || pick(c, 'name', locale)}</strong>
                  <span className="sr-only">{t('home.catCta')}</span>
                  <ArrowUpRight className="tile-arrow size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </nav>
        </section>

        <section className="pt-24">
          <SectionHeading
            eyebrow={t('home.bestEyebrow')}
            title={t('home.bestTitle')}
            action={<Link href="/shop" className="link-grow inline-flex shrink-0 items-center gap-1.5 py-2 text-sm">{t('home.viewAll')} <ArrowRight className="size-4" /></Link>}
          />
          <ProductCarousel products={featured(12)} label={t('home.bestTitle')} />
        </section>

        {/* Popular and New Arrivals show only products the admin ticked; empty sections are hidden. */}
        {popularItems.length ? (
          <section className="pt-24">
            <SectionHeading
              eyebrow={t('home.popularEyebrow')}
              title={t('home.popularTitle')}
              action={<Link href="/shop?sort=popular" className="link-grow inline-flex shrink-0 items-center gap-1.5 py-2 text-sm">{t('home.viewAll')} <ArrowRight className="size-4" /></Link>}
            />
            <ProductCarousel products={popularItems} label={t('home.popularTitle')} />
          </section>
        ) : null}

        {newItems.length ? (
          <section className="pt-24">
            <SectionHeading
              eyebrow={t('home.newEyebrow')}
              title={t('home.newTitle')}
              action={<Link href="/shop?sort=newest" className="link-grow inline-flex shrink-0 items-center gap-1.5 py-2 text-sm">{t('home.viewAll')} <ArrowRight className="size-4" /></Link>}
            />
            <ProductCarousel products={newItems} label={t('home.newTitle')} />
          </section>
        ) : null}
      </Container>

      {/* Brand marquee: duplicated once so the loop is seamless; the copy is hidden from screen readers. */}
      <section aria-label={t('home.brandsLabel')} className="marquee brand-band relative isolate mt-24 overflow-hidden py-5 sm:py-6" data-allow-overflow>
        <div className="brand-fade">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-2 pr-2">
                {[...brands, ...brands].map((b, i) => (
                  <li key={i} style={BRAND_COLOURS[i % BRAND_COLOURS.length] as React.CSSProperties}>
                    <Link href={`/shop?brand=${encodeURIComponent(b)}`} tabIndex={copy === 1 ? -1 : undefined} className="brand-chip">
                      <span className="brand-name font-display">{b}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      <Container>
        <section className="reveal mt-24 grid overflow-hidden rounded-[2rem] bg-ink text-white lg:grid-cols-2">
          <div className="relative min-h-[300px] overflow-hidden lg:order-last">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/photos/repairs-m.webp" srcSet="/img/photos/repairs-m.webp 800w, /img/photos/repairs.webp 1600w" sizes="(min-width: 1024px) 50vw, 100vw" alt="" width={1600} height={1200} loading="lazy" className="absolute inset-0 size-full object-cover" />
          </div>
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow mb-4 text-white/65">{t('home.repairEyebrow')}</p>
            <h2 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.04]">{t('home.repairTitle')}</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-white/80">{t('home.repairBody')}</p>
            <ul className="mt-7 grid gap-3">
              {(['home.repairPoint1', 'home.repairPoint2', 'home.repairPoint3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-sky" />{t(k)}</li>
              ))}
            </ul>
            <Button asChild size="lg" variant="light" className="mt-9"><Link href="/repairs">{t('home.repairsCta')} <ArrowRight /></Link></Button>
          </div>
        </section>

        <section className="reveal pt-24 text-center">
          <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05]">{t('home.ctaTitle')}</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">{t('home.ctaBody')}</p>
          <Button asChild size="lg" variant="ink" className="mt-7"><Link href="/contact">{t('home.ctaButton')}</Link></Button>
        </section>
      </Container>
    </>
  );
}

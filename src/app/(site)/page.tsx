import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/site/container';
import { SectionHeading } from '@/components/site/bits';
import { ProductGrid } from '@/components/site/product-card';
import { Features } from '@/components/site/features';
import { localizedSettings, categories } from '@/lib/store';
import { brandCounts, featured } from '@/lib/catalog';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const site = localizedSettings(locale);
  const tiles = categories().filter((c) => c.show_on_home);
  const headline = site.hero_title.split('\n');
  const brands = brandCounts().map((b) => b.brand).filter((b) => b !== 'Startech');

  return (
    <>
      {/* Hero: the photograph bleeds under the header so the page opens as one dark surface. */}
      <section aria-label={t('home.heroAria')} className="relative isolate flex min-h-[min(82svh,820px)] items-end overflow-hidden bg-ink text-white">
        <div className="hero-parallax absolute inset-0 -z-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={site.hero_image}
            srcSet={site.hero_image === '/img/photos/hero.webp' ? '/img/photos/hero-m.webp 1200w, /img/photos/hero.webp 2400w' : undefined}
            sizes="100vw"
            alt=""
            width={2400}
            height={1500}
            fetchPriority="high"
            decoding="async"
            className="hero-settle size-full object-cover object-[70%_60%] opacity-90"
          />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/35 to-ink/25 md:bg-gradient-to-r md:from-ink/95 md:via-ink/60 md:to-transparent" />
        <Container className="pt-28 pb-14 md:pb-20">
          <h1 className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.98]">
            {headline.map((line, i) => (
              <span key={i} className={cn('hero-rise block', i === headline.length - 1 && headline.length > 1 && 'text-sky italic')} style={{ '--i': i } as React.CSSProperties}>{line}</span>
            ))}
          </h1>
          <p className="hero-rise mt-6 max-w-[34rem] text-base leading-relaxed text-white/85 md:text-lg" style={{ '--i': headline.length } as React.CSSProperties}>{site.hero_subtitle}</p>
          <div className="hero-rise mt-8 flex flex-wrap gap-3" style={{ '--i': headline.length + 1 } as React.CSSProperties}>
            <Button asChild size="lg" variant="light"><Link href={site.hero_button_link}>{site.hero_button_text} <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="glass"><Link href="/repairs">{t('home.repairsCta')}</Link></Button>
          </div>
          <p className="mt-12 hidden items-center gap-2 text-xs text-white/70 md:flex"><ChevronDown className="nudge size-4" /> {t('home.scroll')}</p>
        </Container>
      </section>

      <Container>
        <div className="border-b py-9"><Features /></div>

        <section className="pt-20">
          <SectionHeading eyebrow={t('home.catEyebrow')} title={t('home.catTitle')} />
          <nav aria-label={t('home.catTitle')} className="grid auto-rows-[46vw] grid-cols-2 gap-3 sm:auto-rows-[260px] sm:gap-4 lg:grid-cols-4">
            {tiles.map((c, i) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`}
                className={cn('tile reveal group relative isolate overflow-hidden rounded-[1.5rem] bg-ink text-white', i === 0 && 'col-span-2 row-span-2')}>
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
          <ProductGrid products={featured(8)} cols={4} />
        </section>
      </Container>

      {/* Brand marquee: duplicated once so the loop is seamless; the copy is hidden from screen readers. */}
      <section aria-label={t('home.brandsLabel')} className="marquee mt-24 overflow-hidden border-y py-7" data-allow-overflow>
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {[...brands, ...brands].map((b, i) => <li key={i} className="font-display px-9 text-3xl whitespace-nowrap text-foreground/70">{b}</li>)}
            </ul>
          ))}
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

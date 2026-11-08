import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/site/container';
import { Features } from '@/components/site/features';
import { PageBanner } from '@/components/site/bits';
import { get } from '@/lib/db';
import { render } from '@/lib/markdown';
import { getI18n, titled } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import type { Page } from '@/lib/types';

export const generateMetadata = titled('meta.about');

export default async function AboutPage() {
  const page = get<Page>('SELECT * FROM pages WHERE slug = ?', 'about');
  if (!page) notFound();
  const why = get<Page>('SELECT * FROM pages WHERE slug = ?', 'about-why');
  const { t, locale } = await getI18n();

  return (
    <>
      <PageBanner title={pick(page, 'title', locale)} subtitle={pick(page, 'subtitle', locale)} />
      <Container className="mt-14 grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="reveal overflow-hidden rounded-[1.75rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/photos/about-m.webp" srcSet="/img/photos/about-m.webp 800w, /img/photos/about.webp 1600w" sizes="(min-width: 1024px) 50vw, 100vw" alt={t('about.imageAlt')} width={1600} height={1200} className="h-auto w-full" />
        </div>
        <div className="grid gap-5">
          {/* Content is HTML-escaped by lib/markdown before the tiny formatting syntax is applied. */}
          <div className="prose-content text-[17px]" dangerouslySetInnerHTML={{ __html: render(pick(page, 'body', locale)) }} />
          {why ? (
            <div className="border-t pt-6">
              <h2 className="font-display mb-3 text-4xl">{pick(why, 'title', locale)}</h2>
              <div className="prose-content checklist" dangerouslySetInnerHTML={{ __html: render(pick(why, 'body', locale)) }} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ink" size="lg"><Link href="/shop">{t('about.shop')}</Link></Button>
            <Button asChild variant="white" size="lg"><Link href="/contact">{t('about.contact')}</Link></Button>
          </div>
        </div>
      </Container>
      <Container className="mt-20"><div className="border-t pt-10"><Features /></div></Container>
    </>
  );
}

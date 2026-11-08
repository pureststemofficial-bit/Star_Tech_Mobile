import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/site/container';
import { PageBanner } from '@/components/site/bits';
import { get, all } from '@/lib/db';
import { render } from '@/lib/markdown';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import type { Page } from '@/lib/types';

/* Terms, privacy, returns, delivery and FAQs: text edited in Admin → Pages. */
const INFO_PAGES = ['terms', 'privacy', 'returns', 'delivery', 'faqs'];
type Params = Promise<{ page: string }>;

const load = (slug: string) => (INFO_PAGES.includes(slug) ? get<Page>('SELECT * FROM pages WHERE slug = ?', slug) : undefined);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = load((await params).page);
  const { t, locale } = await getI18n();
  return { title: page ? pick(page, 'title', locale) : t('info.notFound') };
}

export default async function InfoPage({ params }: { params: Params }) {
  const page = load((await params).page);
  if (!page) notFound();
  const { t, locale } = await getI18n();
  const siblings = all<Pick<Page, 'slug' | 'title' | 'title_pt'>>(
    `SELECT slug, title, title_pt FROM pages WHERE slug IN (${INFO_PAGES.map(() => '?').join(',')})`, ...INFO_PAGES);

  return (
    <>
      <PageBanner title={pick(page, 'title', locale)} subtitle={pick(page, 'subtitle', locale)} />
      <Container className="mt-10 grid items-start gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
        <nav aria-label={t('info.nav')} className="scrollbar-none flex gap-1 overflow-x-auto lg:sticky lg:top-40 lg:flex-col">
          {siblings.map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} aria-current={p.slug === page.slug ? 'page' : undefined}
              className={cn('rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-300 hover:bg-muted', p.slug === page.slug && 'bg-ink text-white hover:bg-ink')}>
              {pick(p, 'title', locale)}
            </Link>
          ))}
        </nav>
        {/* HTML-escaped by lib/markdown; admins cannot inject markup. */}
        <div className="prose-content max-w-3xl text-[17px]" dangerouslySetInnerHTML={{ __html: render(pick(page, 'body', locale)) }} />
      </Container>
    </>
  );
}

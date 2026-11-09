import { notFound } from 'next/navigation';
import { Container } from '@/components/site/container';
import { PageBanner, SectionHeading } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { FeaturedPost, PostGrid } from '@/components/site/post-card';
import { blogListing } from '@/lib/blog';
import { getI18n, titled } from '@/lib/i18n/server';
import { int } from '@/lib/validate';

export const generateMetadata = titled('meta.blog');

export default async function BlogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const page = int((await searchParams).page, { min: 1, max: 10000, fallback: 1 });
  const { newest, rest, pages } = blogListing(page);
  if (page > pages) notFound();
  const { t } = await getI18n();

  return (
    <>
      <PageBanner title={t('blog.title')} subtitle={t('blog.subtitle')} />
      <Container className="mt-12">
        {newest ? <FeaturedPost post={newest} /> : null}
        {page === 1 && !newest ? <p className="py-16 text-center text-muted-foreground">{t('blog.empty')}</p> : null}
        {rest.length ? (
          <section className={newest ? 'pt-20' : undefined}>
            <SectionHeading eyebrow={t('blog.latestEyebrow')} title={t('blog.latestTitle')} />
            <PostGrid posts={rest} />
            <Pagination page={page} pages={pages} base="/blog" params={{}} />
          </section>
        ) : null}
      </Container>
    </>
  );
}

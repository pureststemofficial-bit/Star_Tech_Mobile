import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/site/container';
import { PageBanner, SectionHeading } from '@/components/site/bits';
import { PostGrid, PostMeta } from '@/components/site/post-card';
import { findPost, otherPosts } from '@/lib/blog';
import { render } from '@/lib/markdown';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { str } from '@/lib/validate';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = findPost(str((await params).slug, 120));
  const { t, locale } = await getI18n();
  if (!post) return { title: t('blog.notFound') };
  const title = pick(post, 'title', locale);
  const description = pick(post, 'excerpt', locale);
  return {
    title,
    description,
    openGraph: { type: 'article', title, description, publishedTime: post.published, images: [{ url: post.image }] },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const post = findPost(str((await params).slug, 120));
  if (!post) notFound();
  const { t, locale } = await getI18n();
  const others = otherPosts(post.id, 3);

  return (
    <>
      <PageBanner title={pick(post, 'title', locale)} subtitle={pick(post, 'excerpt', locale)}>
        <div className="hero-rise mt-6" style={{ '--i': 2 } as React.CSSProperties}>
          <PostMeta post={post} className="text-sm text-white/75" />
        </div>
      </PageBanner>

      <Container className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,46rem)_320px] lg:justify-between">
        <article>
          <Link href="/blog" className="link-grow mb-6 inline-flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t('blog.back')}
          </Link>
          <div className="overflow-hidden rounded-[1.75rem] bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt="" width={1600} height={900} fetchPriority="high" decoding="async" className="aspect-[16/9] size-full object-cover" />
          </div>
          {/* HTML-escaped by lib/markdown. */}
          <div className="prose-content article mt-9 text-[17px]" dangerouslySetInnerHTML={{ __html: render(pick(post, 'body', locale)) }} />
        </article>

        <aside className="rounded-[1.5rem] bg-ink p-7 text-white lg:sticky lg:top-40 lg:mt-[3.25rem]">
          <p className="eyebrow mb-3 text-white/65">{t('blog.helpEyebrow')}</p>
          <h2 className="font-display text-3xl leading-[1.1]">{t('blog.helpTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{t('blog.helpBody')}</p>
          <div className="mt-6 grid gap-2.5">
            {post.cta_href ? <Button asChild variant="light" className="h-auto min-h-11 py-2.5 whitespace-normal"><Link href={post.cta_href}>{pick(post, 'cta_label', locale)} <ArrowRight /></Link></Button> : null}
            <Button asChild variant="glass" className="h-auto min-h-11 py-2.5 whitespace-normal"><Link href="/contact">{t('foot.contactUs')}</Link></Button>
          </div>
        </aside>
      </Container>

      {others.length ? (
        <Container className="mt-20">
          <div className="border-t pt-12">
            <SectionHeading title={t('blog.keepReading')} action={<Link href="/blog" className="link-grow inline-flex shrink-0 items-center gap-1.5 py-2 text-sm">{t('blog.back')} <ArrowRight className="size-4" /></Link>} />
            <PostGrid posts={others} />
          </div>
        </Container>
      ) : null}
    </>
  );
}

import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { readingMinutes } from '@/lib/blog';
import type { BlogPost } from '@/lib/types';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/** Category, publication date and reading time. */
export async function PostMeta({ post, className }: { post: BlogPost; className?: string }) {
  const { t, locale, date } = await getI18n();
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]', className)}>
      <span>{pick(post, 'category', locale)}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.published}>{date(post.published)}</time>
      <span aria-hidden="true">·</span>
      <span>{t('blog.readTime', { n: readingMinutes(pick(post, 'body', locale)) })}</span>
    </p>
  );
}

/** The newest article, shown large at the top of the blog. */
export async function FeaturedPost({ post }: { post: BlogPost }) {
  const { t, locale } = await getI18n();
  return (
    <Link href={`/blog/${post.slug}`} className="tile reveal grid overflow-hidden rounded-[2rem] bg-ink text-white lg:grid-cols-2">
      <div className="relative min-h-[300px] overflow-hidden lg:min-h-[460px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt="" width={1600} height={1200} fetchPriority="high" decoding="async" className="tile-img absolute inset-0 size-full object-cover" />
      </div>
      <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
        <PostMeta post={post} className="text-white/70" />
        <h2 className="font-display mt-4 text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.04]">{pick(post, 'title', locale)}</h2>
        <p className="mt-5 max-w-lg leading-relaxed text-white/80">{pick(post, 'excerpt', locale)}</p>
        <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium">{t('blog.read')} <ArrowRight className="tile-arrow size-4" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}

export async function PostCard({ post }: { post: BlogPost }) {
  const { locale } = await getI18n();
  return (
    <Link href={`/blog/${post.slug}`} className="tile reveal group block">
      <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.thumb} alt="" width={1000} height={750} loading="lazy" decoding="async" className="tile-img size-full object-cover" />
      </div>
      <PostMeta post={post} className="mt-5 text-muted-foreground" />
      <h3 className="font-display mt-2 flex items-start justify-between gap-3 text-[1.75rem] leading-[1.12]">
        {pick(post, 'title', locale)}
        <ArrowUpRight className="tile-arrow mt-1.5 size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{pick(post, 'excerpt', locale)}</p>
    </Link>
  );
}

export function PostGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => <PostCard key={p.slug} post={p} />)}
    </div>
  );
}

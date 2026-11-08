import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';

type Params = Record<string, string | string[] | number | undefined>;

export async function Pagination({ page, pages, base, params }: { page: number; pages: number; base: string; params: Params }) {
  if (pages <= 1) return null;
  const { t } = await getI18n();
  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      for (const x of ([] as unknown[]).concat(v ?? [])) if (x !== '' && x != null) q.append(k, String(x));
    }
    q.set('page', String(n));
    return `${base}?${q}`;
  };
  const from = Math.max(1, page - 2);
  const to = Math.min(pages, page + 2);
  const item = 'grid size-11 place-items-center rounded-full text-sm tabular-nums transition-colors duration-300 hover:bg-muted';
  const nums = [];
  for (let n = from; n <= to; n++) nums.push(n);

  return (
    <nav aria-label={t('page.nav')} className="mt-14 flex flex-wrap justify-center gap-1">
      {page > 1 ? <Link className={item} href={href(page - 1)} aria-label={t('page.prev')}><ChevronLeft className="size-4" /></Link> : null}
      {from > 1 ? <Link className={item} href={href(1)}>1</Link> : null}
      {from > 2 ? <span className="self-center px-1 text-muted-foreground">…</span> : null}
      {nums.map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className={cn(item, 'bg-ink text-white hover:bg-ink')}>{n}</span>
        ) : (
          <Link key={n} className={item} href={href(n)}>{n}</Link>
        ),
      )}
      {to < pages - 1 ? <span className="self-center px-1 text-muted-foreground">…</span> : null}
      {to < pages ? <Link className={item} href={href(pages)}>{pages}</Link> : null}
      {page < pages ? <Link className={item} href={href(page + 1)} aria-label={t('page.next')}><ChevronRight className="size-4" /></Link> : null}
    </nav>
  );
}

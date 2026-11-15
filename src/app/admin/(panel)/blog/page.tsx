import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownUp, Eye, KeyRound, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterTabs, PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { requireAdmin } from '@/lib/auth';
import { seoOverview } from '@/lib/blog';
import { formatDate } from '@/lib/format';
import { normalize, SEO_CHECK_LABELS, type SeoReport, type SeoStatus } from '@/lib/seo';
import { int, str } from '@/lib/validate';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Blog' };
const PER_PAGE = 25;
const STALE_DAYS = 365;

const BADGE: Record<SeoStatus, 'success' | 'warning' | 'destructive'> = { good: 'success', ok: 'warning', bad: 'destructive' };
const BAR: Record<SeoStatus, string> = { good: 'bg-success', ok: 'bg-warning', bad: 'bg-destructive' };
const TEXT: Record<SeoStatus, string> = { good: 'text-success', ok: 'text-warning', bad: 'text-destructive' };

const FILTERS = {
  '': 'All',
  attention: 'Needs attention',
  nokeyword: 'No focus keyword',
  nopt: 'No Portuguese',
  stale: 'Not updated in a year',
} as const;
type Filter = keyof typeof FILTERS;

const daysSince = (sqlDate: string) => (Date.now() - new Date(`${sqlDate.replace(' ', 'T')}Z`).getTime()) / 86_400_000;

function Score({ report }: { report: SeoReport | null }) {
  if (!report) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge variant={BADGE[report.status]} className="tabular-nums">{report.score}</Badge>;
}

export default async function BlogAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = int(sp.page, { min: 1, max: 10000, fallback: 1 });
  const filter = (Object.hasOwn(FILTERS, sp.seo ?? '') ? sp.seo ?? '' : '') as Filter;
  const issue = Object.hasOwn(SEO_CHECK_LABELS, sp.issue ?? '') ? str(sp.issue, 40) : '';
  const sort = sp.sort === 'score' ? 'score' : '';

  const all = seoOverview();
  const total = all.length;

  /* Blog-wide health */
  const avg = total ? Math.round(all.reduce((a, p) => a + p.en.score, 0) / total) : 0;
  const avgStatus: SeoStatus = avg >= 80 ? 'good' : avg >= 50 ? 'ok' : 'bad';
  const byStatus = { good: 0, ok: 0, bad: 0 } satisfies Record<SeoStatus, number>;
  for (const p of all) byStatus[p.en.status]++;
  const withPt = all.filter((p) => p.pt).length;
  const noKeyword = all.filter((p) => !p.row.focus_keyword.trim()).length;
  const totalWords = all.reduce((a, p) => a + p.en.stats.words, 0);

  const issueCounts = new Map<string, number>();
  for (const p of all) for (const c of p.en.checks) if (c.status === 'bad') issueCounts.set(c.id, (issueCounts.get(c.id) ?? 0) + 1);
  const topIssues = [...issueCounts].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Keyword map: which article targets which phrase, with clashes (keyword cannibalisation) first.
  const keywordMap = new Map<string, { keyword: string; lang: string; posts: { id: number; title: string }[] }>();
  for (const { row } of all) {
    for (const [lang, kw] of [['EN', row.focus_keyword], ['PT', row.focus_keyword_pt]] as const) {
      if (!kw.trim()) continue;
      const key = `${lang}:${normalize(kw)}`;
      const entry = keywordMap.get(key) ?? { keyword: kw.trim(), lang, posts: [] };
      entry.posts.push({ id: row.id, title: row.title });
      keywordMap.set(key, entry);
    }
  }
  const keywords = [...keywordMap.values()].sort((a, b) => b.posts.length - a.posts.length || a.keyword.localeCompare(b.keyword));
  const clashes = keywords.filter((k) => k.posts.length > 1).length;

  /* Filtered list */
  let list = all.filter((p) => {
    if (filter === 'attention' && p.en.score >= 80 && (!p.pt || p.pt.score >= 80)) return false;
    if (filter === 'nokeyword' && p.row.focus_keyword.trim()) return false;
    if (filter === 'nopt' && p.pt) return false;
    if (filter === 'stale' && daysSince(p.row.updated_at) < STALE_DAYS) return false;
    if (issue && !p.en.checks.some((c) => c.id === issue && c.status === 'bad')) return false;
    return true;
  });
  if (sort) list = [...list].sort((a, b) => a.en.score - b.en.score);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const href = (q: Record<string, string>) => {
    const params = new URLSearchParams(Object.entries({ seo: filter, issue, sort, ...q }).filter(([, v]) => v));
    const s = params.toString();
    return s ? `/admin/blog?${s}` : '/admin/blog';
  };

  return (
    <>
      <PageHeader title="Blog" description={`${total} ${total === 1 ? 'article' : 'articles'} · SEO overview, updated live from the article text`}
        actions={<Button asChild><Link href="/admin/blog/new"><Plus />New article</Link></Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-1">
            <p className="text-sm text-muted-foreground">Average SEO score</p>
            <p className={cn('text-3xl font-bold tabular-nums', TEXT[avgStatus])}>{total ? avg : '—'}<span className="text-base font-medium text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground">English versions, across every article</p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-2">
            <p className="text-sm text-muted-foreground">Score breakdown</p>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${byStatus.good} good, ${byStatus.ok} need work, ${byStatus.bad} poor`}>
              {(['good', 'ok', 'bad'] as const).map((s) => byStatus[s] ? <div key={s} className={BAR[s]} style={{ width: `${(byStatus[s] * 100) / total}%` }} /> : null)}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span><b className="text-success">{byStatus.good}</b> good (80+)</span>
              <span><b className="text-warning">{byStatus.ok}</b> need work</span>
              <span><b className="text-destructive">{byStatus.bad}</b> poor (&lt;50)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-1">
            <p className="text-sm text-muted-foreground">Missing focus keyword</p>
            <p className={cn('text-3xl font-bold tabular-nums', noKeyword ? 'text-destructive' : 'text-success')}>{noKeyword}</p>
            <Link href={href({ seo: 'nokeyword', issue: '', page: '' })} className="text-xs font-medium text-primary hover:underline">Show these articles</Link>
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-1">
            <p className="text-sm text-muted-foreground">Portuguese coverage</p>
            <p className="text-3xl font-bold tabular-nums">{withPt}<span className="text-base font-medium text-muted-foreground">/{total}</span></p>
            <p className="text-xs text-muted-foreground">{totalWords.toLocaleString('en-GB')} English words published in total</p>
          </CardContent>
        </Card>
      </div>

      {topIssues.length ? (
        <Card className="gap-3 py-5">
          <CardHeader><CardTitle className="text-base">Most common SEO problems</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topIssues.map(([id, n]) => (
              <Link key={id} href={href({ issue: issue === id ? '' : id, page: '' })}
                className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted', issue === id && 'border-primary bg-primary/5 text-primary')}>
                {SEO_CHECK_LABELS[id]} <span className="rounded-full bg-destructive/10 px-1.5 text-xs font-semibold text-destructive tabular-nums">{n}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {keywords.length ? (
        <Card className="gap-3 py-5">
          <details open={clashes > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 [&::-webkit-details-marker]:hidden">
              <span className="text-base font-semibold">Keyword map</span>
              <span className="text-sm text-muted-foreground">
                {keywords.length} {keywords.length === 1 ? 'keyword' : 'keywords'} targeted
                {clashes ? <> · <b className="text-destructive">{clashes} used by more than one article</b></> : ' · no clashes'}
              </span>
            </summary>
            <div className="mt-4 px-6">
              <p className="mb-3 text-xs text-muted-foreground">Each search phrase should belong to one article. When two articles target the same phrase they compete in Google; change one keyword or merge the articles.</p>
              <Table>
                <TableHeader><TableRow><TableHead>Keyword</TableHead><TableHead>Language</TableHead><TableHead>Articles</TableHead></TableRow></TableHeader>
                <TableBody>
                  {keywords.map((k) => (
                    <TableRow key={`${k.lang}:${k.keyword}`} className={k.posts.length > 1 ? 'bg-destructive/5' : undefined}>
                      <TableCell className="font-medium">{k.keyword}{k.posts.length > 1 ? <Badge variant="destructive" className="ml-2">Clash</Badge> : null}</TableCell>
                      <TableCell>{k.lang}</TableCell>
                      <TableCell className="whitespace-normal">
                        {k.posts.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link href={`/admin/blog/${p.id}`} className="hover:text-primary hover:underline">{p.title}</Link></span>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs active={filter} items={(Object.keys(FILTERS) as Filter[]).map((k) => ({ key: k, label: FILTERS[k], href: href({ seo: k, page: '' }) }))} />
        <div className="flex items-center gap-2">
          {issue ? <Button asChild size="sm" variant="white"><Link href={href({ issue: '', page: '' })}>Clear “{SEO_CHECK_LABELS[issue]}” ×</Link></Button> : null}
          <Button asChild size="sm" variant="white">
            <Link href={href({ sort: sort ? '' : 'score', page: '' })}><ArrowDownUp />{sort ? 'Sort: lowest score first' : 'Sort: newest first'}</Link>
          </Button>
        </div>
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          {shown.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead /><TableHead>Title</TableHead><TableHead>SEO (EN)</TableHead><TableHead>SEO (PT)</TableHead>
                  <TableHead>Words</TableHead><TableHead>Published</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map(({ row: p, en, pt, firstScore }) => {
                  const problems = en.checks.filter((c) => c.status === 'bad');
                  const stale = daysSince(p.updated_at) >= STALE_DAYS;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumb} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-md bg-muted object-cover" />
                      </TableCell>
                      <TableCell className="max-w-[420px] whitespace-normal">
                        <Link href={`/admin/blog/${p.id}`} className="font-semibold hover:text-primary">{p.title}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{p.category}</span>
                          {p.focus_keyword.trim()
                            ? <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-foreground"><KeyRound className="size-3" />{p.focus_keyword}</span>
                            : <span className="text-destructive">No focus keyword</span>}
                          {stale ? <span className="text-warning">Not updated in over a year</span> : null}
                        </div>
                        {problems.length ? (
                          <div className="mt-1 text-xs text-destructive">
                            {problems.slice(0, 2).map((c) => SEO_CHECK_LABELS[c.id]).join(' · ')}{problems.length > 2 ? ` · +${problems.length - 2} more` : ''}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Score report={en} />
                        {firstScore !== undefined && firstScore !== en.score ? (
                          <div className={cn('mt-1 text-[11px] font-medium tabular-nums', en.score > firstScore ? 'text-success' : 'text-destructive')} title={`First recorded score: ${firstScore}`}>
                            {en.score > firstScore ? '▲' : '▼'} {Math.abs(en.score - firstScore)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell><Score report={pt} /></TableCell>
                      <TableCell className="tabular-nums">{en.stats.words}</TableCell>
                      <TableCell>{formatDate(p.published)}</TableCell>
                      <TableCell><StatusBadge status={p.is_active ? 'active' : 'hidden'} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button asChild size="icon-sm" variant="white"><Link href={`/admin/blog/${p.id}`} aria-label={`Edit ${p.title}`}><Pencil /></Link></Button>
                          {p.is_active ? <Button asChild size="icon-sm" variant="white"><a href={`/blog/${p.slug}`} target="_blank" rel="noopener" aria-label={`View ${p.title}`}><Eye /></a></Button> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : <p className="p-6 text-center text-sm text-muted-foreground">{total ? 'No articles match this filter.' : 'No articles yet.'}</p>}
          <Pagination page={page} pages={pages} base="/admin/blog" params={{ seo: filter, issue, sort }} />
        </CardContent>
      </Card>
    </>
  );
}

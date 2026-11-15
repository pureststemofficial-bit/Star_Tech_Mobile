import type { Metadata } from 'next';
import Link from 'next/link';
import Form from 'next/form';
import { ArrowDownUp, Eye, KeyRound, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterTabs, PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { requireAdmin } from '@/lib/auth';
import { categories } from '@/lib/store';
import { money } from '@/lib/format';
import { productSeoOverview } from '@/lib/product-seo-admin';
import { PRODUCT_CHECK_LABELS } from '@/lib/product-seo';
import { normalize, type SeoReport, type SeoStatus } from '@/lib/seo';
import { str, int } from '@/lib/validate';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Products' };
const PER_PAGE = 25;

const BADGE: Record<SeoStatus, 'success' | 'warning' | 'destructive'> = { good: 'success', ok: 'warning', bad: 'destructive' };
const BAR: Record<SeoStatus, string> = { good: 'bg-success', ok: 'bg-warning', bad: 'bg-destructive' };
const TEXT: Record<SeoStatus, string> = { good: 'text-success', ok: 'text-warning', bad: 'text-destructive' };

const FILTERS = {
  '': 'All',
  attention: 'Needs SEO attention',
  nokeyword: 'No focus keyword',
  photos: 'Fewer than 3 photos',
  nopt: 'No Portuguese',
} as const;
type Filter = keyof typeof FILTERS;

function Score({ report }: { report: SeoReport | null }) {
  if (!report) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge variant={BADGE[report.status]} className="tabular-nums">{report.score}</Badge>;
}

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = str(sp.q, 100);
  const category = int(sp.category, { min: 0, fallback: 0 });
  const page = int(sp.page, { min: 1, max: 10000, fallback: 1 });
  const filter = (Object.hasOwn(FILTERS, sp.seo ?? '') ? sp.seo ?? '' : '') as Filter;
  const issue = Object.hasOwn(PRODUCT_CHECK_LABELS, sp.issue ?? '') ? str(sp.issue, 40) : '';
  const sort = sp.sort === 'score' ? 'score' : '';

  const all = productSeoOverview();
  const total = all.length;

  /* Catalogue-wide SEO health */
  const avg = total ? Math.round(all.reduce((a, p) => a + p.en.score, 0) / total) : 0;
  const avgStatus: SeoStatus = avg >= 80 ? 'good' : avg >= 50 ? 'ok' : 'bad';
  const byStatus = { good: 0, ok: 0, bad: 0 } satisfies Record<SeoStatus, number>;
  for (const p of all) byStatus[p.en.status]++;
  const noKeyword = all.filter((p) => !p.row.focus_keyword.trim()).length;
  const fewPhotos = all.filter((p) => p.row.image_count < 3).length;

  const issueCounts = new Map<string, number>();
  for (const p of all) for (const c of p.en.checks) if (c.status === 'bad') issueCounts.set(c.id, (issueCounts.get(c.id) ?? 0) + 1);
  const topIssues = [...issueCounts].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Keyword map: which product targets which phrase, with clashes first.
  const keywordMap = new Map<string, { keyword: string; lang: string; items: { id: number; name: string }[] }>();
  for (const { row } of all) {
    for (const [lang, kw] of [['EN', row.focus_keyword], ['PT', row.focus_keyword_pt]] as const) {
      if (!kw.trim()) continue;
      const key = `${lang}:${normalize(kw)}`;
      const entry = keywordMap.get(key) ?? { keyword: kw.trim(), lang, items: [] };
      entry.items.push({ id: row.id, name: row.name });
      keywordMap.set(key, entry);
    }
  }
  const keywords = [...keywordMap.values()].sort((a, b) => b.items.length - a.items.length || a.keyword.localeCompare(b.keyword));
  const clashes = keywords.filter((k) => k.items.length > 1).length;

  /* Filtered list */
  const needle = normalize(q);
  let list = all.filter((p) => {
    if (needle && !normalize(`${p.row.name} ${p.row.brand}`).includes(needle)) return false;
    if (category && p.row.category_id !== category) return false;
    if (filter === 'attention' && p.en.score >= 80 && (!p.pt || p.pt.score >= 80)) return false;
    if (filter === 'nokeyword' && p.row.focus_keyword.trim()) return false;
    if (filter === 'photos' && p.row.image_count >= 3) return false;
    if (filter === 'nopt' && p.pt) return false;
    if (issue && !p.en.checks.some((c) => c.id === issue && c.status === 'bad')) return false;
    return true;
  });
  if (sort) list = [...list].sort((a, b) => a.en.score - b.en.score);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const params = { q, category: category ? String(category) : '', seo: filter, issue, sort };
  const href = (change: Partial<typeof params>) => {
    const s = new URLSearchParams(Object.entries({ ...params, ...change }).filter(([, v]) => v)).toString();
    return s ? `/admin/products?${s}` : '/admin/products';
  };

  return (
    <>
      <PageHeader title="Products" description={`${total} products · SEO scores update live from each product's text`}
        actions={<Button asChild><Link href="/admin/products/new"><Plus />Add product</Link></Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-1">
            <p className="text-sm text-muted-foreground">Average SEO score</p>
            <p className={cn('text-3xl font-bold tabular-nums', TEXT[avgStatus])}>{total ? avg : '—'}<span className="text-base font-medium text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground">English versions, across every product</p>
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
            <Link href={href({ seo: 'nokeyword', issue: '' })} className="text-xs font-medium text-primary hover:underline">Show these products</Link>
          </CardContent>
        </Card>
        <Card className="gap-2 py-5">
          <CardContent className="grid gap-1">
            <p className="text-sm text-muted-foreground">Fewer than 3 photos</p>
            <p className={cn('text-3xl font-bold tabular-nums', fewPhotos ? 'text-warning' : 'text-success')}>{fewPhotos}</p>
            <Link href={href({ seo: 'photos', issue: '' })} className="text-xs font-medium text-primary hover:underline">Show these products</Link>
          </CardContent>
        </Card>
      </div>

      {topIssues.length ? (
        <Card className="gap-3 py-5">
          <CardHeader><CardTitle className="text-base">Most common SEO problems</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topIssues.map(([id, n]) => (
              <Link key={id} href={href({ issue: issue === id ? '' : id })}
                className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted', issue === id && 'border-primary bg-primary/5 text-primary')}>
                {PRODUCT_CHECK_LABELS[id]} <span className="rounded-full bg-destructive/10 px-1.5 text-xs font-semibold text-destructive tabular-nums">{n}</span>
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
                {clashes ? <> · <b className="text-destructive">{clashes} used by more than one product</b></> : ' · no clashes'}
              </span>
            </summary>
            <div className="mt-4 px-6">
              <p className="mb-3 text-xs text-muted-foreground">Each search phrase should belong to one product. When two products target the same phrase they compete in Google; make each one more specific (model, size, colour).</p>
              <Table>
                <TableHeader><TableRow><TableHead>Keyword</TableHead><TableHead>Language</TableHead><TableHead>Products</TableHead></TableRow></TableHeader>
                <TableBody>
                  {keywords.map((k) => (
                    <TableRow key={`${k.lang}:${k.keyword}`} className={k.items.length > 1 ? 'bg-destructive/5' : undefined}>
                      <TableCell className="font-medium">{k.keyword}{k.items.length > 1 ? <Badge variant="destructive" className="ml-2">Clash</Badge> : null}</TableCell>
                      <TableCell>{k.lang}</TableCell>
                      <TableCell className="whitespace-normal">
                        {k.items.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link href={`/admin/products/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link></span>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        </Card>
      ) : null}

      <Form action="/admin/products" className="flex flex-wrap gap-2">
        {filter ? <input type="hidden" name="seo" value={filter} /> : null}
        {sort ? <input type="hidden" name="sort" value={sort} /> : null}
        <Input name="q" type="search" defaultValue={q} placeholder="Search name or brand" aria-label="Search products" className="w-64" />
        <div className="w-56">
          <NativeSelect name="category" defaultValue={category || ''} aria-label="Category">
            <option value="">All categories</option>
            {categories().map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </div>
        <Button type="submit" variant="white">Filter</Button>
      </Form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs active={filter} items={(Object.keys(FILTERS) as Filter[]).map((k) => ({ key: k, label: FILTERS[k], href: href({ seo: k }) }))} />
        <div className="flex items-center gap-2">
          {issue ? <Button asChild size="sm" variant="white"><Link href={href({ issue: '' })}>Clear “{PRODUCT_CHECK_LABELS[issue]}” ×</Link></Button> : null}
          <Button asChild size="sm" variant="white">
            <Link href={href({ sort: sort ? '' : 'score' })}><ArrowDownUp />{sort ? 'Sort: lowest SEO score first' : 'Sort: newest first'}</Link>
          </Button>
        </div>
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          {shown.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead /><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead>
                  <TableHead>SEO (EN)</TableHead><TableHead>SEO (PT)</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map(({ row: p, en, pt, firstScore }) => {
                  const problems = en.checks.filter((c) => c.status === 'bad');
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumb || '/img/products/placeholder.svg'} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-md bg-muted object-contain p-0.5" />
                      </TableCell>
                      <TableCell className="max-w-[380px] whitespace-normal">
                        <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-primary">{p.name}</Link>
                        <div className="text-xs text-muted-foreground">{p.brand}{p.is_featured ? ' · ★ Best seller' : ''}{p.is_popular ? ' · Popular' : ''}{p.is_new_arrival ? ' · New arrival' : ''}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          {p.focus_keyword.trim()
                            ? <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><KeyRound className="size-3" />{p.focus_keyword}</span>
                            : <span className="text-destructive">No focus keyword</span>}
                          {problems.length ? (
                            <span className="text-destructive">
                              {problems.slice(0, 2).map((c) => PRODUCT_CHECK_LABELS[c.id]).join(' · ')}{problems.length > 2 ? ` · +${problems.length - 2} more` : ''}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{p.category || '—'}</TableCell>
                      <TableCell>{money(p.price_pence)}</TableCell>
                      <TableCell className={p.stock < 5 ? 'font-semibold text-warning' : ''}>{p.stock}</TableCell>
                      <TableCell>
                        <Score report={en} />
                        {firstScore !== undefined && firstScore !== en.score ? (
                          <div className={cn('mt-1 text-[11px] font-medium tabular-nums', en.score > firstScore ? 'text-success' : 'text-destructive')} title={`First recorded score: ${firstScore}`}>
                            {en.score > firstScore ? '▲' : '▼'} {Math.abs(en.score - firstScore)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell><Score report={pt} /></TableCell>
                      <TableCell><StatusBadge status={p.is_active ? 'active' : 'hidden'} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button asChild size="icon-sm" variant="white"><Link href={`/admin/products/${p.id}`} aria-label={`Edit ${p.name}`}><Pencil /></Link></Button>
                          <Button asChild size="icon-sm" variant="white"><a href={`/product/${p.slug}`} target="_blank" rel="noopener" aria-label={`View ${p.name}`}><Eye /></a></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : <p className="p-6 text-center text-sm text-muted-foreground">{total ? 'No products match these filters.' : 'No products yet.'}</p>}
          <Pagination page={page} pages={pages} base="/admin/products" params={params} />
        </CardContent>
      </Card>
    </>
  );
}

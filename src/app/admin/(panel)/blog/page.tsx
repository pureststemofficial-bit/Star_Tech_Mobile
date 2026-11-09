import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { requireAdmin } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { int } from '@/lib/validate';
import type { BlogPost } from '@/lib/types';

export const metadata: Metadata = { title: 'Blog' };
const PER_PAGE = 25;

export default async function BlogAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const page = int((await searchParams).page, { min: 1, max: 10000, fallback: 1 });
  const total = get<{ n: number }>('SELECT COUNT(*) AS n FROM blog_posts')?.n ?? 0;
  const posts = all<Pick<BlogPost, 'id' | 'slug' | 'title' | 'category' | 'published' | 'thumb' | 'is_active'>>(
    'SELECT id, slug, title, category, published, thumb, is_active FROM blog_posts ORDER BY published DESC, id DESC LIMIT ? OFFSET ?', PER_PAGE, (page - 1) * PER_PAGE);

  return (
    <>
      <PageHeader title="Blog" description={`${total} ${total === 1 ? 'article' : 'articles'}`}
        actions={<Button asChild><Link href="/admin/blog/new"><Plus />New article</Link></Button>} />
      <Card className="py-2">
        <CardContent className="px-2">
          {posts.length ? (
            <Table>
              <TableHeader><TableRow><TableHead /><TableHead>Title</TableHead><TableHead>Published</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-md bg-muted object-cover" />
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/blog/${p.id}`} className="font-semibold hover:text-primary">{p.title}</Link>
                      <div className="text-xs text-muted-foreground">{p.category}</div>
                    </TableCell>
                    <TableCell>{formatDate(p.published)}</TableCell>
                    <TableCell><StatusBadge status={p.is_active ? 'active' : 'hidden'} /></TableCell>
                    <TableCell className="flex gap-1">
                      <Button asChild size="icon-sm" variant="white"><Link href={`/admin/blog/${p.id}`} aria-label={`Edit ${p.title}`}><Pencil /></Link></Button>
                      {p.is_active ? <Button asChild size="icon-sm" variant="white"><a href={`/blog/${p.slug}`} target="_blank" rel="noopener" aria-label={`View ${p.title}`}><Eye /></a></Button> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="p-6 text-center text-sm text-muted-foreground">No articles yet.</p>}
          <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} base="/admin/blog" params={{}} />
        </CardContent>
      </Card>
    </>
  );
}

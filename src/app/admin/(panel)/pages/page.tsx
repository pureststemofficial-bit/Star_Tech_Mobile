import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Pages' };

export default async function PagesAdmin() {
  await requireAdmin();
  const pages = all<{ slug: string; title: string; updated_at: string }>('SELECT slug, title, updated_at FROM pages ORDER BY slug');
  return (
    <>
      <PageHeader title="Pages" description={<>Edit the text of your information pages. Banners, contact details and the home page are under <Link href="/admin/settings" className="text-primary">Settings</Link>.</>} />
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader><TableRow><TableHead>Page</TableHead><TableHead>Address</TableHead><TableHead>Last updated</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {pages.map((p) => {
                const url = p.slug === 'about-why' ? '/about' : `/${p.slug}`;
                return (
                  <TableRow key={p.slug}>
                    <TableCell>
                      <Link href={`/admin/pages/${p.slug}`} className="font-semibold text-primary">{p.title}</Link>
                      {p.slug === 'about-why' ? <div className="text-xs text-muted-foreground">“Why choose us” box on the About page</div> : null}
                    </TableCell>
                    <TableCell><a href={url} target="_blank" rel="noopener" className="text-primary">{url}</a></TableCell>
                    <TableCell>{formatDate(p.updated_at, true)}</TableCell>
                    <TableCell><Button asChild size="sm" variant="white"><Link href={`/admin/pages/${p.slug}`}><Pencil />Edit</Link></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

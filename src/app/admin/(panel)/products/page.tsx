import type { Metadata } from 'next';
import Link from 'next/link';
import Form from 'next/form';
import { Eye, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { Pagination } from '@/components/site/pagination';
import { requireAdmin } from '@/lib/auth';
import { get, all, type Param } from '@/lib/db';
import { categories } from '@/lib/store';
import { escapeLike } from '@/lib/catalog';
import { money } from '@/lib/format';
import { str, int } from '@/lib/validate';

export const metadata: Metadata = { title: 'Products' };
const PER_PAGE = 25;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = str(sp.q, 100);
  const category = int(sp.category, { min: 0, fallback: 0 });
  const page = int(sp.page, { min: 1, max: 10000, fallback: 1 });
  const where = ['1 = 1'];
  const params: Param[] = [];
  if (q) { where.push("(p.name LIKE ? ESCAPE '\\' OR p.brand LIKE ? ESCAPE '\\')"); params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`); }
  if (category) { where.push('p.category_id = ?'); params.push(category); }
  const w = where.join(' AND ');
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM products p WHERE ${w}`, ...params)?.n ?? 0;
  const products = all<{ id: number; name: string; slug: string; brand: string; price_pence: number; stock: number; is_active: number; is_featured: number; category: string | null; thumb: string | null }>(`
    SELECT p.id, p.name, p.slug, p.brand, p.price_pence, p.stock, p.is_active, p.is_featured, c.name AS category,
      (SELECT thumb FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order, id LIMIT 1) AS thumb
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${w} ORDER BY p.id DESC LIMIT ? OFFSET ?`, ...params, PER_PAGE, (page - 1) * PER_PAGE);

  return (
    <>
      <PageHeader title="Products" description={`${total} products`}
        actions={<Button asChild><Link href="/admin/products/new"><Plus />Add product</Link></Button>} />
      <Form action="/admin/products" className="flex flex-wrap gap-2">
        <Input name="q" type="search" defaultValue={q} placeholder="Search name or brand" aria-label="Search products" className="w-64" />
        <div className="w-56">
          <NativeSelect name="category" defaultValue={category || ''} aria-label="Category">
            <option value="">All categories</option>
            {categories().map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </div>
        <Button type="submit" variant="white">Filter</Button>
      </Form>
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader><TableRow><TableHead /><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumb || '/img/products/placeholder.svg'} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-md bg-muted object-contain p-0.5" />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-primary">{p.name}</Link>
                    <div className="text-xs text-muted-foreground">{p.brand}{p.is_featured ? ' · ★ Best seller' : ''}</div>
                  </TableCell>
                  <TableCell>{p.category || '—'}</TableCell>
                  <TableCell>{money(p.price_pence)}</TableCell>
                  <TableCell className={p.stock < 5 ? 'font-semibold text-warning' : ''}>{p.stock}</TableCell>
                  <TableCell><StatusBadge status={p.is_active ? 'active' : 'hidden'} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button asChild size="icon-sm" variant="white"><Link href={`/admin/products/${p.id}`} aria-label={`Edit ${p.name}`}><Pencil /></Link></Button>
                    <Button asChild size="icon-sm" variant="white"><a href={`/product/${p.slug}`} target="_blank" rel="noopener" aria-label={`View ${p.name}`}><Eye /></a></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} base="/admin/products" params={{ q, category: category || '' }} />
        </CardContent>
      </Card>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { PageHeader } from '@/components/admin/page-header';
import { saveCategory, deleteCategory } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { categories } from '@/lib/store';
import { int } from '@/lib/validate';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin();
  const cats = categories();
  const editId = int((await searchParams).edit, { fallback: 0 });
  const edit = cats.find((c) => c.id === editId);
  const c = edit ?? { id: 0, name: '', name_pt: '', slug: '', nav_label: '', nav_label_pt: '', sort_order: cats.length, show_in_nav: 0, show_on_home: 1, image: '' };

  return (
    <>
      <PageHeader title="Categories" description="Control the shop categories, the main menu and the home page tiles." />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="py-2">
          <CardContent className="px-2">
            <Table>
              <TableHeader><TableRow><TableHead /><TableHead>Name</TableHead><TableHead>Products</TableHead><TableHead>Menu</TableHead><TableHead>Home tile</TableHead><TableHead>Order</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {cats.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {cat.image ? <img src={cat.image} alt="" width={44} height={44} className="size-11 rounded-md bg-muted object-contain p-0.5" /> : null}
                    </TableCell>
                    <TableCell><strong>{cat.name}</strong><div className="text-xs text-muted-foreground">/{cat.slug}{cat.nav_label ? ` · “${cat.nav_label}”` : ''}</div></TableCell>
                    <TableCell>{cat.product_count}</TableCell>
                    <TableCell>{cat.show_in_nav ? 'Yes' : '—'}</TableCell>
                    <TableCell>{cat.show_on_home ? 'Yes' : '—'}</TableCell>
                    <TableCell>{cat.sort_order}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button asChild size="icon-sm" variant="white"><Link href={`/admin/categories?edit=${cat.id}`} aria-label={`Edit ${cat.name}`}><Pencil /></Link></Button>
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <ConfirmButton size="icon-sm" variant="white" aria-label={`Delete ${cat.name}`} message={`Delete category “${cat.name}”? Its products will become uncategorised.`}><Trash2 /></ConfirmButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{edit ? 'Edit category' : 'Add category'}</CardTitle></CardHeader>
          <CardContent>
            <ActionForm key={c.id} action={saveCategory} className="grid gap-4">
              <input type="hidden" name="id" value={c.id || ''} />
              <Field label="Name" htmlFor="cname"><Input id="cname" name="name" defaultValue={c.name} required maxLength={80} /></Field>
              <Field label="Short label" htmlFor="nav_label" hint="Used in the menu and on the home tile."><Input id="nav_label" name="nav_label" defaultValue={c.nav_label} maxLength={40} /></Field>
              <Field label="Name (Portuguese)" htmlFor="cname_pt"><Input id="cname_pt" name="name_pt" defaultValue={c.name_pt} maxLength={80} /></Field>
              <Field label="Short label (Portuguese)" htmlFor="nav_label_pt"><Input id="nav_label_pt" name="nav_label_pt" defaultValue={c.nav_label_pt} maxLength={40} /></Field>
              <Field label="URL slug" htmlFor="cslug" hint="Leave blank to generate."><Input id="cslug" name="slug" defaultValue={c.slug} maxLength={80} /></Field>
              <Field label="Sort order" htmlFor="sort_order"><Input id="sort_order" name="sort_order" type="number" min={0} defaultValue={c.sort_order} /></Field>
              <Label className="font-medium"><Checkbox name="show_in_nav" defaultChecked={!!c.show_in_nav} /> Show in main menu</Label>
              <Label className="font-medium"><Checkbox name="show_on_home" defaultChecked={!!c.show_on_home} /> Show as home page tile</Label>
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" width={96} height={96} className="size-24 rounded-md bg-muted object-contain" />
              ) : null}
              <Field label="Tile image" htmlFor="cimage"><Input id="cimage" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="h-auto py-2" /></Field>
              <SubmitButton className="w-full">{edit ? 'Save category' : 'Add category'}</SubmitButton>
              {edit ? <Link href="/admin/categories" className="text-center text-sm text-primary">Cancel</Link> : null}
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

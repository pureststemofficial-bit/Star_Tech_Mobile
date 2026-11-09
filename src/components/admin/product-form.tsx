import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { saveProduct, deleteProduct } from '@/actions/admin';
import { fromPence } from '@/lib/format';
import type { Category, Product, ProductImage } from '@/lib/types';

/** Create / edit form for a product, including image upload, removal and main-image choice. */
export function ProductForm({ product, images, cats }: { product?: Product; images: ProductImage[]; cats: Category[] }) {
  const p = product;
  return (
    <>
      <ActionForm action={saveProduct} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_340px]">
        <input type="hidden" name="id" value={p?.id ?? ''} />
        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic information</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Product name" htmlFor="name"><Input id="name" name="name" defaultValue={p?.name} required maxLength={150} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="category_id">
                  <NativeSelect id="category_id" name="category_id" defaultValue={p?.category_id ?? ''}>
                    <option value="">— None —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Brand" htmlFor="brand"><Input id="brand" name="brand" defaultValue={p?.brand} maxLength={60} /></Field>
              </div>
              <Field label="Short description" htmlFor="short_desc" hint="Shown in search results and as the page's Google description.">
                <Input id="short_desc" name="short_desc" defaultValue={p?.short_desc} maxLength={300} />
              </Field>
              <Field label="Full description" htmlFor="description" hint="Leave a blank line between paragraphs.">
                <Textarea id="description" name="description" defaultValue={p?.description} rows={7} maxLength={10000} />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Key features" htmlFor="features" hint="One per line. Shown with green ticks.">
                <Textarea id="features" name="features" defaultValue={p?.features} rows={5} maxLength={3000} />
              </Field>
              <Field label="Specifications" htmlFor="specs" hint='One per line as "Name: Value".'>
                <Textarea id="specs" name="specs" defaultValue={p?.specs} rows={6} maxLength={5000} placeholder={'Display: 6.1 inch\nBattery: 3274 mAh'} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Colours" htmlFor="colours" hint='One per line as "Name|#hex".'>
                  <Textarea id="colours" name="colours" defaultValue={p?.colours} rows={4} maxLength={2000} placeholder={'Black|#1b1d22\nBlue|#1e63ff'} />
                </Field>
                <Field label="Options / storage" htmlFor="options" hint='One per line as "Name|+extra €".'>
                  <Textarea id="options" name="options" defaultValue={p?.options} rows={4} maxLength={2000} placeholder={'128GB\n256GB|+100'} />
                </Field>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Portuguese version</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-muted-foreground">Shown to visitors browsing in Portuguese. Anything left blank falls back to the English text.</p>
              <Field label="Product name" htmlFor="name_pt"><Input id="name_pt" name="name_pt" defaultValue={p?.name_pt} maxLength={150} /></Field>
              <Field label="Short description" htmlFor="short_desc_pt"><Input id="short_desc_pt" name="short_desc_pt" defaultValue={p?.short_desc_pt} maxLength={300} /></Field>
              <Field label="Full description" htmlFor="description_pt"><Textarea id="description_pt" name="description_pt" defaultValue={p?.description_pt} rows={6} maxLength={10000} /></Field>
              <Field label="Key features" htmlFor="features_pt" hint="One per line."><Textarea id="features_pt" name="features_pt" defaultValue={p?.features_pt} rows={5} maxLength={3000} /></Field>
              <Field label="Specifications" htmlFor="specs_pt" hint='One per line as "Name: Value".'><Textarea id="specs_pt" name="specs_pt" defaultValue={p?.specs_pt} rows={6} maxLength={5000} /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {images.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                  {images.map((img, i) => (
                    <div key={img.id} className="grid gap-1.5 rounded-lg border p-2 text-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.thumb} alt="" width={120} height={120} loading="lazy" className="aspect-square w-full rounded-md bg-muted object-contain" />
                      <label className="flex items-center gap-2"><input type="radio" name="main_image" value={img.id} defaultChecked={i === 0} className="accent-primary" /> Main image</label>
                      <label className="flex items-center gap-2 text-destructive"><input type="checkbox" name="remove_image" value={img.id} className="accent-destructive" /> Remove</label>
                    </div>
                  ))}
                </div>
              ) : null}
              <Field label="Upload images" htmlFor="images" hint="JPG, PNG or WebP, up to 8 MB each. Images are optimised and converted to WebP automatically.">
                <Input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="h-auto border-dashed py-2" />
              </Field>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-5 xl:sticky xl:top-20">
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing &amp; stock</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Price (€)" htmlFor="price"><Input id="price" name="price" inputMode="decimal" defaultValue={p ? fromPence(p.price_pence) : ''} required placeholder="699.00" /></Field>
              <Field label="Was price (€)" htmlFor="compare" optional hint="Shows a sale badge when higher than the price.">
                <Input id="compare" name="compare" inputMode="decimal" defaultValue={p?.compare_pence ? fromPence(p.compare_pence) : ''} />
              </Field>
              <Field label="Stock quantity" htmlFor="stock"><Input id="stock" name="stock" type="number" min={0} defaultValue={p?.stock ?? 10} required /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Visibility</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Label className="font-medium"><Checkbox name="is_active" defaultChecked={p ? !!p.is_active : true} /> Visible on website</Label>
              <Label className="font-medium"><Checkbox name="is_featured" defaultChecked={!!p?.is_featured} /> Show in Best Sellers</Label>
              <Field label="URL slug" htmlFor="slug" hint="Leave blank to generate from the name." className="mt-2">
                <Input id="slug" name="slug" defaultValue={p?.slug} maxLength={100} />
              </Field>
            </CardContent>
          </Card>
          <SubmitButton size="lg" className="w-full">{p ? 'Save changes' : 'Create product'}</SubmitButton>
        </div>
      </ActionForm>
      {p ? (
        <form action={deleteProduct} className="border-t pt-4">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton variant="destructive" size="sm" message="Delete this product permanently? Past orders keep their details.">
            <Trash2 /> Delete product
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}

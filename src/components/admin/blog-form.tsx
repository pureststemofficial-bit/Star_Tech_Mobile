import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { FormattingHelp } from '@/components/admin/formatting-help';
import { saveBlogPost, deleteBlogPost } from '@/actions/admin';
import type { BlogPost } from '@/lib/types';

/** Create / edit form for a blog article. */
export function BlogForm({ post }: { post?: BlogPost }) {
  const p = post;
  return (
    <>
      {/* The grid sits inside the form so a validation message spans the full width above it. */}
      <ActionForm action={saveBlogPost}>
        <input type="hidden" name="id" value={p?.id ?? ''} />
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Article</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Title" htmlFor="title"><Input id="title" name="title" defaultValue={p?.title} required maxLength={160} /></Field>
              <Field label="Category" htmlFor="category" hint="A short label such as Repairs, Tips or Buying guides.">
                <Input id="category" name="category" defaultValue={p?.category} required maxLength={40} />
              </Field>
              <Field label="Summary" htmlFor="excerpt" hint="One or two sentences. Shown on the blog page and as the Google description.">
                <Textarea id="excerpt" name="excerpt" defaultValue={p?.excerpt} required rows={2} maxLength={300} />
              </Field>
              <Field label="Article text" htmlFor="body"><Textarea id="body" name="body" defaultValue={p?.body} required rows={20} maxLength={50000} className="font-mono text-sm" /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Portuguese version</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-muted-foreground">Shown to visitors browsing in Portuguese. Anything left blank falls back to the English text.</p>
              <Field label="Title" htmlFor="title_pt"><Input id="title_pt" name="title_pt" defaultValue={p?.title_pt} maxLength={160} /></Field>
              <Field label="Category" htmlFor="category_pt"><Input id="category_pt" name="category_pt" defaultValue={p?.category_pt} maxLength={40} /></Field>
              <Field label="Summary" htmlFor="excerpt_pt"><Textarea id="excerpt_pt" name="excerpt_pt" defaultValue={p?.excerpt_pt} rows={2} maxLength={300} /></Field>
              <Field label="Article text" htmlFor="body_pt"><Textarea id="body_pt" name="body_pt" defaultValue={p?.body_pt} rows={20} maxLength={50000} className="font-mono text-sm" /></Field>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-5 xl:sticky xl:top-20">
          <Card>
            <CardHeader><CardTitle className="text-base">Cover image</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {p ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumb} alt="" width={400} height={225} loading="lazy" className="aspect-[16/9] w-full rounded-md bg-muted object-cover" />
              ) : null}
              <Field label={p ? 'Replace image' : 'Upload image'} htmlFor="image" hint="JPG, PNG or WebP, up to 8 MB. A wide photo works best.">
                <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required={!p} className="h-auto border-dashed py-2" />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Label className="font-medium"><Checkbox name="is_active" defaultChecked={p ? !!p.is_active : true} /> Visible on website</Label>
              <Field label="Publication date" htmlFor="published" hint="The newest date is featured at the top of the blog.">
                <Input id="published" name="published" type="date" defaultValue={p?.published ?? new Date().toISOString().slice(0, 10)} required />
              </Field>
              <Field label="URL slug" htmlFor="slug" hint="Leave blank to generate from the title. Changing it breaks existing links to the article.">
                <Input id="slug" name="slug" defaultValue={p?.slug} maxLength={100} />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Button beside the article</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Link" htmlFor="cta_href" optional hint="For example /repairs or /shop?category=chargers-cables">
                <Input id="cta_href" name="cta_href" defaultValue={p?.cta_href} maxLength={300} />
              </Field>
              <Field label="Button text" htmlFor="cta_label" optional><Input id="cta_label" name="cta_label" defaultValue={p?.cta_label} maxLength={60} /></Field>
              <Field label="Button text (Portuguese)" htmlFor="cta_label_pt" optional><Input id="cta_label_pt" name="cta_label_pt" defaultValue={p?.cta_label_pt} maxLength={60} /></Field>
            </CardContent>
          </Card>
          <FormattingHelp />
          <SubmitButton size="lg" className="w-full">{p ? 'Save changes' : 'Create article'}</SubmitButton>
        </div>
        </div>
      </ActionForm>
      {p ? (
        <form action={deleteBlogPost} className="border-t pt-4">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton variant="destructive" size="sm" message="Delete this article permanently?">
            <Trash2 /> Delete article
          </ConfirmButton>
        </form>
      ) : null}
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { FormattingHelp } from '@/components/admin/formatting-help';
import { PageHeader } from '@/components/admin/page-header';
import { savePage } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { get } from '@/lib/db';
import { str } from '@/lib/validate';
import type { Page } from '@/lib/types';

export const metadata: Metadata = { title: 'Edit page' };

export default async function PageEditor({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const page = get<Page>('SELECT * FROM pages WHERE slug = ?', str((await params).slug, 40));
  if (!page) notFound();
  return (
    <>
      <PageHeader title={`Edit page: ${page.title}`} back={{ href: '/admin/pages', label: 'All pages' }} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_300px]">
        <Card>
          <CardContent>
            <ActionForm action={savePage} toastOnSuccess className="grid gap-4">
              <input type="hidden" name="slug" value={page.slug} />
              <Field label="Title" htmlFor="title"><Input id="title" name="title" defaultValue={page.title} required maxLength={120} /></Field>
              <Field label="Subtitle" htmlFor="subtitle"><Input id="subtitle" name="subtitle" defaultValue={page.subtitle} maxLength={300} /></Field>
              <Field label="Content" htmlFor="body"><Textarea id="body" name="body" rows={22} maxLength={50000} defaultValue={page.body} className="font-mono text-sm" /></Field>
              <h2 className="mt-2 border-t pt-4 font-semibold">Portuguese version</h2>
              <Field label="Title" htmlFor="title_pt"><Input id="title_pt" name="title_pt" defaultValue={page.title_pt} maxLength={120} /></Field>
              <Field label="Subtitle" htmlFor="subtitle_pt"><Input id="subtitle_pt" name="subtitle_pt" defaultValue={page.subtitle_pt} maxLength={300} /></Field>
              <Field label="Content" htmlFor="body_pt"><Textarea id="body_pt" name="body_pt" rows={22} maxLength={50000} defaultValue={page.body_pt} className="font-mono text-sm" /></Field>
              <div><SubmitButton>Save page</SubmitButton></div>
            </ActionForm>
          </CardContent>
        </Card>
        <FormattingHelp />
      </div>
    </>
  );
}

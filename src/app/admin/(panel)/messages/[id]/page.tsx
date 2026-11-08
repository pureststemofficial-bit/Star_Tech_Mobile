import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmButton } from '@/components/forms/action-form';
import { PageHeader } from '@/components/admin/page-header';
import { DetailList } from '@/components/admin/detail-list';
import { deleteMessage } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { get, run } from '@/lib/db';
import { settings } from '@/lib/store';
import { formatDate } from '@/lib/format';
import { int } from '@/lib/validate';
import type { Message } from '@/lib/types';

export const metadata: Metadata = { title: 'Message' };

export default async function MessageAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const m = get<Message>('SELECT * FROM messages WHERE id = ?', int((await params).id));
  if (!m) notFound();
  if (!m.is_read) run('UPDATE messages SET is_read = 1 WHERE id = ?', m.id);
  const subject = encodeURIComponent(`Re: your message to ${settings().site_name}`);
  return (
    <>
      <PageHeader title={`Message from ${m.name}`} back={{ href: '/admin/messages', label: 'All messages' }} />
      <Card>
        <CardContent className="grid gap-5">
          <DetailList items={[
            ['Email', <a key="e" href={`mailto:${m.email}`} className="text-primary">{m.email}</a>],
            ['Phone', m.phone],
            ['Received', formatDate(m.created_at, true)],
          ]} />
          <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{m.body}</div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href={`mailto:${m.email}?subject=${subject}`}><Mail />Reply by email</a></Button>
            <form action={deleteMessage}>
              <input type="hidden" name="id" value={m.id} />
              <ConfirmButton variant="white" message="Delete this message?"><Trash2 />Delete</ConfirmButton>
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

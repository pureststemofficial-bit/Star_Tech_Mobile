import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/admin/page-header';
import { requireAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesAdmin() {
  await requireAdmin();
  const messages = all<Message>('SELECT * FROM messages ORDER BY id DESC LIMIT 300');
  return (
    <>
      <PageHeader title="Messages" description="Sent from the Contact page." />
      <Card className="py-2">
        <CardContent className="px-2">
          {!messages.length ? <p className="p-4 text-sm text-muted-foreground">No messages yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>From</TableHead><TableHead>Message</TableHead><TableHead>Received</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {messages.map((m) => (
                  <TableRow key={m.id} className={cn(!m.is_read && 'bg-secondary/40 font-semibold')}>
                    <TableCell><Link href={`/admin/messages/${m.id}`} className="text-primary">{m.name}</Link><div className="text-xs font-normal text-muted-foreground">{m.email}</div></TableCell>
                    <TableCell className="max-w-[360px] truncate">{m.body}</TableCell>
                    <TableCell>{formatDate(m.created_at, true)}</TableCell>
                    <TableCell>{!m.is_read ? <Badge variant="secondary">New</Badge> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

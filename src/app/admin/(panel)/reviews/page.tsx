import type { Metadata } from 'next';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge, Stars } from '@/components/site/bits';
import { approveReview, deleteReview } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { Review } from '@/lib/types';

export const metadata: Metadata = { title: 'Reviews' };

export default async function ReviewsAdmin() {
  await requireAdmin();
  const reviews = all<Review & { product_name: string; product_slug: string }>(`
    SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM reviews r JOIN products p ON p.id = r.product_id
    ORDER BY r.is_approved ASC, r.id DESC LIMIT 300`);
  return (
    <>
      <PageHeader title="Reviews" description="New reviews stay hidden until you approve them." />
      <Card className="py-2">
        <CardContent className="px-2">
          {!reviews.length ? <p className="p-4 text-sm text-muted-foreground">No reviews yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Rating</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <a href={`/product/${r.product_slug}`} target="_blank" rel="noopener" className="font-semibold text-primary">{r.product_name}</a>
                      <div className="text-xs text-muted-foreground">{r.author} · {formatDate(r.created_at)}</div>
                    </TableCell>
                    <TableCell><Stars rating={r.rating} /></TableCell>
                    <TableCell className="min-w-[240px] whitespace-normal">{r.body}</TableCell>
                    <TableCell><StatusBadge status={r.is_approved ? 'approved' : 'pending'} /></TableCell>
                    <TableCell className="flex gap-1">
                      {!r.is_approved ? (
                        <form action={approveReview}><input type="hidden" name="id" value={r.id} /><SubmitButton size="sm">Approve</SubmitButton></form>
                      ) : null}
                      <form action={deleteReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton size="icon-sm" variant="white" aria-label="Delete review" message="Delete this review?"><Trash2 /></ConfirmButton>
                      </form>
                    </TableCell>
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

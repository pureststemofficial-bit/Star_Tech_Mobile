import type { Metadata } from 'next';
import Link from 'next/link';
import Form from 'next/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmButton } from '@/components/forms/action-form';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { toggleCustomer } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { escapeLike } from '@/lib/catalog';
import { formatDate, money } from '@/lib/format';
import { str } from '@/lib/validate';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const q = str((await searchParams).q, 100);
  const like = `%${escapeLike(q)}%`;
  const customers = all<{ id: number; name: string; email: string; phone: string; role: string; is_active: number; created_at: string; order_count: number; spent: number }>(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
      (SELECT COALESCE(SUM(total_pence), 0) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') AS spent
    FROM users u WHERE (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\') ORDER BY u.id DESC LIMIT 300`, like, like);

  return (
    <>
      <PageHeader title="Customers" description={`${customers.length} accounts`} />
      <Form action="/admin/customers" className="flex gap-2">
        <Input name="q" type="search" defaultValue={q} placeholder="Search name or email" aria-label="Search customers" className="w-64" />
        <Button type="submit" variant="white">Search</Button>
      </Form>
      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead><TableHead>Orders</TableHead><TableHead>Spent</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <strong>{c.name}</strong> {c.role === 'admin' ? <Badge variant="secondary">Admin</Badge> : null}
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </TableCell>
                  <TableCell>{c.phone || '—'}</TableCell>
                  <TableCell>{formatDate(c.created_at)}</TableCell>
                  <TableCell><Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="text-primary">{c.order_count}</Link></TableCell>
                  <TableCell>{money(c.spent)}</TableCell>
                  <TableCell><StatusBadge status={c.is_active ? 'active' : 'disabled'} /></TableCell>
                  <TableCell>
                    {c.id !== admin.id ? (
                      <form action={toggleCustomer}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton size="sm" variant="white" message={c.is_active ? 'Disable this account? They will be signed out.' : 'Re-enable this account?'}>
                          {c.is_active ? 'Disable' : 'Enable'}
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

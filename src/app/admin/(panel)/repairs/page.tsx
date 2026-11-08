import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterTabs, PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/site/bits';
import { requireAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { label } from '@/lib/format';
import { oneOf } from '@/lib/validate';
import type { Repair } from '@/lib/types';

export const metadata: Metadata = { title: 'Repair bookings' };
const STATUSES = ['new', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

export default async function RepairsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const status = oneOf((await searchParams).status, ['', ...STATUSES], '');
  const repairs = status
    ? all<Repair>('SELECT * FROM repairs WHERE status = ? ORDER BY id DESC LIMIT 200', status)
    : all<Repair>('SELECT * FROM repairs ORDER BY id DESC LIMIT 200');
  return (
    <>
      <PageHeader title="Repair bookings" />
      <FilterTabs active={status} items={[{ key: '', label: 'All', href: '/admin/repairs' }, ...STATUSES.map((s) => ({ key: s, label: label(s), href: `/admin/repairs?status=${s}` }))]} />
      <Card className="py-2">
        <CardContent className="px-2">
          {!repairs.length ? <p className="p-4 text-sm text-muted-foreground">No repair bookings.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Customer</TableHead><TableHead>Device</TableHead><TableHead>Repair</TableHead><TableHead>Appointment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {repairs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Link href={`/admin/repairs/${r.id}`} className="font-semibold text-primary">{r.ref}</Link></TableCell>
                    <TableCell>{r.full_name}<div className="text-xs text-muted-foreground">{r.phone}</div></TableCell>
                    <TableCell>{r.brand} {r.model}<div className="text-xs text-muted-foreground">{r.device_type}</div></TableCell>
                    <TableCell>{r.repair_type}</TableCell>
                    <TableCell>{r.preferred_date}<div className="text-xs text-muted-foreground">{r.preferred_time}</div></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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

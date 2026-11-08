import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/site/bits';
import { requireUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { getI18n, titled } from '@/lib/i18n/server';
import type { Repair } from '@/lib/types';

export const generateMetadata = titled('meta.repairs');

export default async function MyRepairsPage() {
  const user = await requireUser('/account/repairs');
  const { t, money } = await getI18n();
  const repairs = all<Repair>('SELECT * FROM repairs WHERE user_id = ? OR (user_id IS NULL AND email = ?) ORDER BY id DESC', user.id, user.email);
  return (
    <Card>
      <CardHeader><h1 className="font-display text-5xl leading-none">{t('myRepairs.title')}</h1></CardHeader>
      <CardContent>
        {!repairs.length ? (
          <div className="grid justify-items-start gap-4">
            <p className="text-muted-foreground">{t('myRepairs.none')}</p>
            <Button asChild variant="ink"><Link href="/repairs">{t('myRepairs.book')}</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('myRepairs.ref')}</TableHead><TableHead>{t('myRepairs.device')}</TableHead><TableHead>{t('myRepairs.repair')}</TableHead>
              <TableHead>{t('myRepairs.appointment')}</TableHead><TableHead>{t('myRepairs.status')}</TableHead><TableHead>{t('myRepairs.quote')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {repairs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.ref}</TableCell>
                  <TableCell>{r.brand} {r.model}</TableCell>
                  <TableCell>{r.repair_type}</TableCell>
                  <TableCell>{r.preferred_date} {r.preferred_time}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>{r.quote_pence ? money(r.quote_pence) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

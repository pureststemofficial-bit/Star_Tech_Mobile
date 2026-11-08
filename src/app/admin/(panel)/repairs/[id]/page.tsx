import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { PageHeader } from '@/components/admin/page-header';
import { DetailList } from '@/components/admin/detail-list';
import { updateRepair, deleteRepair } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { get } from '@/lib/db';
import { formatDate, fromPence, label } from '@/lib/format';
import { int } from '@/lib/validate';
import type { Repair } from '@/lib/types';

export const metadata: Metadata = { title: 'Repair booking' };

export default async function RepairAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const r = get<Repair>('SELECT * FROM repairs WHERE id = ?', int((await params).id));
  if (!r) notFound();
  return (
    <>
      <PageHeader title={`Repair ${r.ref}`} description={`Booked ${formatDate(r.created_at, true)}`} back={{ href: '/admin/repairs', label: 'All repairs' }} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Booking details</CardTitle></CardHeader>
          <CardContent>
            <DetailList items={[
              ['Device', `${r.device_type} — ${r.brand} ${r.model}`],
              ['Repair type', r.repair_type],
              ['Appointment', `${r.preferred_date}, ${r.preferred_time}`],
              ['Customer', r.full_name],
              ['Phone', <a key="p" href={`tel:${r.phone}`} className="text-primary">{r.phone}</a>],
              ['Email', <a key="e" href={`mailto:${r.email}`} className="text-primary">{r.email}</a>],
              ['Details', r.details],
            ]} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Update</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={updateRepair} toastOnSuccess className="grid gap-4">
                <input type="hidden" name="id" value={r.id} />
                <Field label="Status" htmlFor="status">
                  <NativeSelect id="status" name="status" defaultValue={r.status}>
                    {['new', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Quote (£)" htmlFor="quote" hint="Shown to the customer in their account.">
                  <Input id="quote" name="quote" inputMode="decimal" defaultValue={r.quote_pence ? fromPence(r.quote_pence) : ''} />
                </Field>
                <Field label="Internal notes" htmlFor="admin_notes"><Textarea id="admin_notes" name="admin_notes" rows={5} maxLength={3000} defaultValue={r.admin_notes} /></Field>
                <SubmitButton className="w-full">Save</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
          <form action={deleteRepair}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmButton variant="destructive" size="sm" message="Delete this repair booking?"><Trash2 /> Delete booking</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}

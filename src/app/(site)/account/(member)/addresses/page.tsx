import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { addAddress, deleteAddress, setDefaultAddress } from '@/actions/account';
import { requireUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { getI18n, titled } from '@/lib/i18n/server';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types';

export const generateMetadata = titled('meta.addresses');

export default async function AddressesPage() {
  const user = await requireUser('/account/addresses');
  const { t } = await getI18n();
  const addresses = all<Address>('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', user.id);
  return (
    <>
      <Card>
        <CardHeader><h1 className="font-display text-5xl leading-none">{t('addresses.title')}</h1></CardHeader>
        <CardContent>
          {!addresses.length ? <p className="text-muted-foreground">{t('addresses.none')}</p> : null}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className={cn('rounded-lg border-[1.5px] p-4 text-sm', a.is_default && 'border-primary')}>
                {a.is_default ? <Badge variant="secondary" className="mb-2">{t('addresses.default')}</Badge> : null}
                <p className="mb-3">
                  <strong>{a.full_name}</strong><br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.city}, {a.postcode}
                  {a.phone ? <><br />{a.phone}</> : null}
                </p>
                <div className="flex gap-2">
                  {!a.is_default ? (
                    <form action={setDefaultAddress}><input type="hidden" name="id" value={a.id} /><SubmitButton variant="ghost" size="sm">{t('addresses.makeDefault')}</SubmitButton></form>
                  ) : null}
                  <form action={deleteAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton message={t('addresses.deleteConfirm')} variant="ghost" size="sm" className="text-destructive">{t('addresses.delete')}</ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('addresses.add')}</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={addAddress} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.fullName')} htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={user.name} required maxLength={100} /></Field>
              <Field label={t('form.phone')} htmlFor="phone" optional><Input id="phone" name="phone" type="tel" defaultValue={user.phone} maxLength={20} /></Field>
            </div>
            <Field label={t('form.line1')} htmlFor="line1"><Input id="line1" name="line1" required maxLength={120} /></Field>
            <Field label={t('form.line2')} htmlFor="line2" optional><Input id="line2" name="line2" maxLength={120} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.city')} htmlFor="city"><Input id="city" name="city" required maxLength={60} /></Field>
              <Field label={t('form.postcode')} htmlFor="postcode"><Input id="postcode" name="postcode" required maxLength={10} /></Field>
            </div>
            <div><SubmitButton variant="ink">{t('addresses.save')}</SubmitButton></div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}

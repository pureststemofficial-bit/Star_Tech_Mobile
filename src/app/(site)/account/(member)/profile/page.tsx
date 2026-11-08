import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { PasswordForm } from '@/components/forms/password-form';
import { updateProfile } from '@/actions/account';
import { requireUser } from '@/lib/auth';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('meta.profile');

export default async function ProfilePage() {
  const user = await requireUser('/account/profile');
  const { t } = await getI18n();
  return (
    <>
      <Card>
        <CardHeader><h1 className="font-display text-5xl leading-none">{t('profile.title')}</h1></CardHeader>
        <CardContent>
          <ActionForm action={updateProfile} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.fullName')} htmlFor="name"><Input id="name" name="name" defaultValue={user.name} required maxLength={100} /></Field>
              <Field label={t('form.phone')} htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user.phone} maxLength={20} /></Field>
            </div>
            <Field label={t('form.email')} htmlFor="em"><Input id="em" value={user.email} disabled /></Field>
            <div><SubmitButton variant="ink">{t('profile.save')}</SubmitButton></div>
          </ActionForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t('profile.changePassword')}</CardTitle></CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </>
  );
}

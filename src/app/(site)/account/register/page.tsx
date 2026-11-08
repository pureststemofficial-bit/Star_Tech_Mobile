import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Container } from '@/components/site/container';
import { register } from '@/actions/account';
import { currentUser } from '@/lib/auth';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('register.title');

export default async function RegisterPage() {
  if (await currentUser()) redirect('/account');
  const { t } = await getI18n();
  return (
    <Container className="max-w-md">
      <Card className="mt-10">
        <CardHeader>
          <h1 className="font-display text-5xl leading-none">{t('register.title')}</h1>
          <CardDescription>{t('register.body')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={register} className="grid gap-4">
            <Field label={t('form.fullName')} htmlFor="name"><Input id="name" name="name" autoComplete="name" required maxLength={100} /></Field>
            <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
            <Field label={t('form.phone')} htmlFor="phone" optional><Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={20} /></Field>
            <Field label={t('form.password')} htmlFor="password" hint={t('form.passwordHint')}>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} />
            </Field>
            <Field label={t('form.confirmPassword')} htmlFor="password_confirm">
              <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required maxLength={200} />
            </Field>
            <SubmitButton size="lg" variant="ink" className="w-full">{t('register.title')}</SubmitButton>
          </ActionForm>
          <p className="mt-5 text-center text-sm">{t('register.already')} <Link href="/account/login" className="font-medium text-primary hover:underline">{t('register.signIn')}</Link></p>
        </CardContent>
      </Card>
    </Container>
  );
}

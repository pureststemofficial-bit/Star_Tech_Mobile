import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Container } from '@/components/site/container';
import { login } from '@/actions/account';
import { currentUser } from '@/lib/auth';
import { safeRedirectPath } from '@/lib/helpers';
import { settings } from '@/lib/store';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('login.title');

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentUser()) redirect('/account');
  const next = safeRedirectPath((await searchParams).next, '/account');
  const { t } = await getI18n();
  return (
    <Container className="max-w-md">
      <Card className="mt-10">
        <CardHeader>
          <h1 className="font-display text-5xl leading-none">{t('login.title')}</h1>
          <CardDescription>{t('login.body', { site: settings().site_name })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={login} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required autoFocus maxLength={254} /></Field>
            <Field label={t('form.password')} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} /></Field>
            <SubmitButton size="lg" variant="ink" className="w-full">{t('login.title')}</SubmitButton>
          </ActionForm>
          <p className="mt-5 text-center text-sm">{t('login.new')} <Link href="/account/register" className="font-medium text-primary hover:underline">{t('login.create')}</Link></p>
        </CardContent>
      </Card>
    </Container>
  );
}

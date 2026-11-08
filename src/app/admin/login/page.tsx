import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { adminLogin } from '@/actions/admin';
import { currentUser } from '@/lib/auth';
import { safeRedirectPath } from '@/lib/helpers';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user?.role === 'admin') redirect('/admin');
  const next = safeRedirectPath((await searchParams).next, '/admin');
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-navy to-navy-deep p-4">
      <div className="grid w-full max-w-sm justify-items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo.svg" alt="Startech Mobile" width={220} height={57} />
        <Card className="w-full">
          <CardHeader><CardTitle className="text-xl">Admin sign in</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={adminLogin} className="grid gap-4">
              <input type="hidden" name="next" value={next} />
              <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required autoFocus maxLength={254} /></Field>
              <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} /></Field>
              <SubmitButton className="w-full">Sign in</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <a href="/" className="text-sm text-[#c9d2e3] hover:text-white">← Back to website</a>
      </div>
    </main>
  );
}

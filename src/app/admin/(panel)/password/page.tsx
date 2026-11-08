import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/page-header';
import { PasswordForm } from '@/components/forms/password-form';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'Change password' };

export default async function AdminPasswordPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Change password" description="Use a long, unique passphrase. Other signed-in devices are signed out after a change." />
      <Card className="max-w-2xl">
        <CardContent><PasswordForm /></CardContent>
      </Card>
    </>
  );
}

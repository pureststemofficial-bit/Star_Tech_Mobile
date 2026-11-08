import { Container } from '@/components/site/container';
import { AccountNav } from './account-nav';
import { requireUser } from '@/lib/auth';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Container className="mt-10 grid items-start gap-6 lg:grid-cols-[250px_1fr]">
      <AccountNav isAdmin={user.role === 'admin'} />
      <div className="grid min-w-0 gap-5">{children}</div>
    </Container>
  );
}

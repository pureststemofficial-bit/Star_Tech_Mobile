import type { Metadata } from 'next';
import { User } from 'lucide-react';
import { Flash } from '@/components/site/flash';
import { AdminSidebar, MobileAdminMenu } from './sidebar';
import { requireAdmin } from '@/lib/auth';
import { get } from '@/lib/db';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const badges = get<{ orders: number; repairs: number; messages: number; reviews: number }>(`SELECT
      (SELECT COUNT(*) FROM orders WHERE status = 'processing') AS orders,
      (SELECT COUNT(*) FROM repairs WHERE status = 'new') AS repairs,
      (SELECT COUNT(*) FROM messages WHERE is_read = 0) AS messages,
      (SELECT COUNT(*) FROM reviews WHERE is_approved = 0) AS reviews`)!;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <AdminSidebar badges={badges} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3 lg:px-6">
          <MobileAdminMenu badges={badges} />
          <span className="flex-1 font-semibold text-muted-foreground lg:hidden">Admin</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground"><User className="size-4" />{user.name}</span>
        </header>
        <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 p-4 lg:p-6">
          <Flash />
          {children}
        </main>
      </div>
    </div>
  );
}

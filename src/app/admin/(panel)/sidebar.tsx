'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Eye, FileText, Layers, LayoutGrid, Lock, LogOut, Menu, MessageSquare, Package, Settings, Star, Tag, Users, Wrench } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { adminLogout } from '@/actions/admin';
import { cn } from '@/lib/utils';

type Badges = { orders: number; repairs: number; messages: number; reviews: number };

const NAV = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', Icon: Package, badge: 'orders' },
  { href: '/admin/products', label: 'Products', Icon: Tag },
  { href: '/admin/categories', label: 'Categories', Icon: Layers },
  { href: '/admin/repairs', label: 'Repairs', Icon: Wrench, badge: 'repairs' },
  { href: '/admin/messages', label: 'Messages', Icon: MessageSquare, badge: 'messages' },
  { href: '/admin/reviews', label: 'Reviews', Icon: Star, badge: 'reviews' },
  { href: '/admin/customers', label: 'Customers', Icon: Users },
  { href: '/admin/pages', label: 'Pages', Icon: FileText },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
] as const;

export function AdminSidebar({ badges, onNavigate }: { badges: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = 'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white [&_svg]:size-[18px]';
  return (
    <div className="flex h-full flex-col bg-sidebar p-3">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 px-2 pt-1 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo.svg" alt="Startech Mobile" width={150} height={39} />
        <span className="rounded-full bg-cobalt px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Admin</span>
      </Link>
      <nav aria-label="Admin" className="grid gap-0.5">
        {NAV.map((n) => {
          const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
          const count = 'badge' in n ? badges[n.badge] : 0;
          return (
            <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={cn(item, active && 'bg-sidebar-primary text-white hover:bg-sidebar-primary')}>
              <n.Icon />
              <span className="flex-1">{n.label}</span>
              {count ? <span className="rounded-full bg-[#e5484d] px-2 text-[11px] font-bold text-white">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-0.5 border-t border-sidebar-border pt-3">
        <a href="/" target="_blank" rel="noopener" className={item}><Eye />View website</a>
        <Link href="/admin/password" onClick={onNavigate} className={item}><Lock />Change password</Link>
        <form action={adminLogout}><button type="submit" className={item}><LogOut />Logout</button></form>
      </div>
    </div>
  );
}

export function MobileAdminMenu({ badges }: { badges: Badges }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-md border p-1.5 lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] border-0 p-0">
        <SheetTitle className="sr-only">Admin menu</SheetTitle>
        <AdminSidebar badges={badges} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

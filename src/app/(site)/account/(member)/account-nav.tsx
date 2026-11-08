'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headset, Heart, LayoutGrid, LogOut, MapPin, Package, Settings, User, Wrench } from 'lucide-react';
import { logout } from '@/actions/account';
import { useI18n } from '@/components/i18n-provider';
import type { ClientKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

const LINKS: { href: string; label: ClientKey; Icon: typeof User }[] = [
  { href: '/account', label: 'account.dashboard', Icon: LayoutGrid },
  { href: '/account/orders', label: 'account.orders', Icon: Package },
  { href: '/account/addresses', label: 'account.addresses', Icon: MapPin },
  { href: '/account/wishlist', label: 'account.wishlist', Icon: Heart },
  { href: '/account/repairs', label: 'account.repairs', Icon: Wrench },
  { href: '/account/profile', label: 'account.details', Icon: User },
  { href: '/contact', label: 'account.support', Icon: Headset },
];

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const item = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap hover:bg-muted [&_svg]:size-4';
  return (
    <nav aria-label={t('nav.account')} className="scrollbar-none flex gap-1 overflow-x-auto rounded-[1.25rem] border border-border/70 bg-card p-2 lg:sticky lg:top-40 lg:flex-col">
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === '/account' ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn(item, active && 'bg-secondary text-primary')} aria-current={active ? 'page' : undefined}>
            <Icon />{t(label)}
          </Link>
        );
      })}
      {isAdmin ? <a href="/admin" className={item}><Settings />{t('nav.admin')}</a> : null}
      <form action={logout}>
        <button type="submit" className={item}><LogOut />{t('account.logout')}</button>
      </form>
    </nav>
  );
}

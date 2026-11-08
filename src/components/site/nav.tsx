'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

type NavLink = { href: string; label: string };

function useIsActive() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (href: string) => {
    const [path, query] = href.split('?');
    if (query) return pathname === path && params.get('category') === new URLSearchParams(query).get('category');
    return path === '/' ? pathname === '/' : pathname.startsWith(path) && !params.get('category');
  };
}

function MainNavInner({ links }: { links: NavLink[] }) {
  const isActive = useIsActive();
  return (
    <ul className="scrollbar-none mx-auto flex max-w-[1320px] gap-6 overflow-x-auto px-4 sm:px-6 lg:justify-center lg:gap-9">
      {links.map((l) => {
        const active = isActive(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                "relative block py-2.5 text-[13px] whitespace-nowrap text-white/80 transition-colors duration-300 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-500 after:content-[''] hover:text-white hover:after:scale-x-100",
                active && 'text-white after:scale-x-100',
              )}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Category bar under the header (scrolls sideways on small screens). */
export function MainNav({ links }: { links: NavLink[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('nav.main')} className="border-t border-white/[0.07]">
      <Suspense fallback={<div className="h-[41px]" />}>
        <MainNavInner links={links} />
      </Suspense>
    </nav>
  );
}

/** Slide-out menu for phones. */
export function MobileMenu({ links, user }: { links: NavLink[]; user: { name: string; isAdmin: boolean } | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const extra = [
    { href: '/account', label: user ? t('nav.accountNamed', { name: user.name.split(' ')[0] }) : t('nav.signIn') },
    { href: '/account/orders', label: t('nav.orders') },
    { href: '/account/wishlist', label: t('account.wishlist') },
    { href: '/track-order', label: t('nav.track') },
    { href: '/cart', label: t('nav.basket') },
  ];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-11 place-items-center rounded-full hover:bg-white/10 lg:hidden" aria-label={t('nav.openMenu')}>
        <Menu className="size-6 stroke-[1.6]" />
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-0 bg-ink text-white">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-white">{t('nav.menu')}</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-0.5 overflow-y-auto px-3 pb-6" aria-label={t('nav.mobile')}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="rounded-lg px-3 py-3 text-lg hover:bg-white/10">{l.label}</Link>
          ))}
          <hr className="my-3 border-white/10" />
          {extra.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">{l.label}</Link>
          ))}
          {user?.isAdmin ? (
            <a href="/admin" className="rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">{t('nav.admin')}</a>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

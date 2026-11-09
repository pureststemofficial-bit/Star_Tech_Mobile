import Link from 'next/link';
import Form from 'next/form';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { localizedSettings, categories } from '@/lib/store';
import { readSession } from '@/lib/session';
import { currentUser } from '@/lib/auth';
import { summary } from '@/lib/cart';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { MainNav, MobileMenu } from './nav';
import { LanguageSwitch } from './language-switch';

export async function Header() {
  const [session, user, { t, locale, money }] = await Promise.all([readSession(), currentUser(), getI18n()]);
  const cart = summary(session?.data);
  const site = localizedSettings(locale);
  const links = [
    { href: '/shop', label: t('nav.shop') },
    ...categories().filter((c) => c.show_in_nav).map((c) => ({ href: `/shop?category=${c.slug}`, label: pick(c, 'nav_label', locale) || pick(c, 'name', locale) })),
    { href: '/repairs', label: t('nav.repairs') },
    { href: '/blog', label: t('nav.blog') },
    { href: '/about', label: t('nav.about') },
    { href: '/contact', label: t('nav.contact') },
  ];
  const actionClass = 'relative grid size-11 place-items-center rounded-full text-white transition-colors duration-300 hover:bg-white/10 [&_svg]:size-[21px] [&_svg]:stroke-[1.6]';

  return (
    <header className="site-header sticky top-0 z-40 bg-ink text-white backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 px-4 py-2.5 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-8">
        <div className="flex items-center gap-1">
          <MobileMenu links={[{ href: '/', label: t('nav.home') }, ...links]} user={user ? { name: user.name, isAdmin: user.role === 'admin' } : null} />
          <Link href="/" aria-label={t('head.homeAria', { name: site.site_name })} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.svg" alt="" width={200} height={52} className="h-auto w-[136px] md:w-[158px]" />
          </Link>
        </div>

        <Form action="/shop" role="search" className="order-last col-span-full flex h-11 items-center overflow-hidden rounded-full bg-white/[0.09] ring-1 ring-white/10 transition-all duration-300 focus-within:bg-white/15 focus-within:ring-white/40 lg:order-none lg:col-span-1 lg:mx-auto lg:w-full lg:max-w-[520px]">
          <label htmlFor="q" className="sr-only">{t('head.search')}</label>
          <button type="submit" aria-label={t('head.searchSubmit')} className="grid size-11 shrink-0 place-items-center text-white/75 hover:text-white">
            <Search className="size-[18px]" />
          </button>
          <input
            id="q"
            name="q"
            type="search"
            placeholder={t('head.searchPlaceholder')}
            maxLength={100}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent pr-5 text-sm text-white outline-none placeholder:text-white/65"
          />
        </Form>

        <nav aria-label={t('head.account')} className="flex items-center gap-0.5">
          <LanguageSwitch className="mr-1.5" />
          <Link href="/account" aria-label={user ? user.name.split(' ')[0] : t('head.account')} className={actionClass}><User /></Link>
          <Link href="/account/wishlist" aria-label={t('head.wishlist')} className={`${actionClass} max-sm:hidden`}><Heart /></Link>
          <Link href="/cart" aria-label={`${t('head.basketAria', { n: cart.count })}, ${money(cart.total)}`} className={actionClass}>
            <ShoppingBag />
            {cart.count > 0 ? (
              <span key={cart.count} className="cart-pop absolute top-0.5 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cobalt px-1 text-[11px] font-semibold">
                {cart.count}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
      <MainNav links={links} />
    </header>
  );
}

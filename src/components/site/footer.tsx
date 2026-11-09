import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { localizedOptions, localizedSettings, categories } from '@/lib/store';
import { getI18n } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import { BrandIcon } from './brand-icons';

export async function Footer() {
  const { t, locale } = await getI18n();
  const site = localizedSettings(locale);
  const socials = [
    ['facebook', site.social_facebook],
    ['instagram', site.social_instagram],
    ['tiktok', site.social_tiktok],
    ['youtube', site.social_youtube],
  ].filter(([, url]) => url);
  const quick = [
    { href: '/shop', label: t('nav.shop') },
    ...categories().filter((c) => c.show_in_nav).map((c) => ({ href: `/shop?category=${c.slug}`, label: pick(c, 'nav_label', locale) || pick(c, 'name', locale) })),
    { href: '/repairs', label: t('nav.repairs') },
    { href: '/blog', label: t('nav.blog') },
    { href: '/about', label: t('foot.about') },
    { href: '/contact', label: t('foot.contactUs') },
  ];
  const service = [
    { href: '/delivery', label: t('foot.delivery') },
    { href: '/returns', label: t('foot.returns') },
    { href: '/terms', label: t('foot.terms') },
    { href: '/privacy', label: t('foot.privacy') },
    { href: '/faqs', label: t('foot.faqs') },
    { href: '/track-order', label: t('foot.track') },
  ];
  // Only what checkout really offers, so the footer never promises a payment method we don't take.
  const payments = localizedOptions('payment_methods', locale).map((m) => m.label.replace(/\s*\(.*\)$/, ''));

  return (
    <footer className="mt-24 bg-ink text-sm text-white/75">
      <div className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6">
        <p className="font-display max-w-3xl text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] text-white">{site.tagline}</p>
        <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 pb-12 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr_1.1fr]">
          <div className="col-span-full lg:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.svg" alt={site.site_name} width={190} height={50} loading="lazy" className="h-auto w-[170px]" />
            {socials.length ? (
              <div className="mt-5 flex gap-2.5">
                {socials.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name}
                    className="grid size-11 place-items-center rounded-full border border-white/15 text-white transition-colors duration-300 hover:border-white hover:bg-white hover:text-ink">
                    <BrandIcon name={name} className="size-[18px]" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <FooterList title={t('foot.explore')} links={quick} />
          <FooterList title={t('foot.service')} links={service} />
          <div>
            <h2 className="eyebrow mb-4 text-white/60">{t('foot.contact')}</h2>
            <ul className="grid gap-3">
              <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 stroke-[1.5]" /><span className="whitespace-pre-line">{site.address}</span></li>
              <li className="flex items-center gap-2.5"><Phone className="size-4 shrink-0 stroke-[1.5]" /><a className="link-grow py-1 hover:text-white" href={`tel:${site.phone.replace(/[^+0-9]/g, '')}`}>{site.phone}</a></li>
              <li className="flex items-center gap-2.5"><Mail className="size-4 shrink-0 stroke-[1.5]" /><a className="link-grow py-1 break-all hover:text-white" href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-4 text-white/60">{t('foot.pay')}</h2>
            <ul className="grid gap-2">{payments.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-xs text-white/60">
          <span>&copy; {new Date().getFullYear()} {site.site_name}. {t('foot.rights')}</span>
          <span>{site.announcement}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="eyebrow mb-4 text-white/60">{title}</h2>
      <ul className="grid gap-1">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="link-grow inline-block py-1 hover:text-white">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

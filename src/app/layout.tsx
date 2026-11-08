import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/components/i18n-provider';
import { localizedSettings } from '@/lib/store';
import { getLocale } from '@/lib/i18n/server';
import { INTL_TAG } from '@/lib/i18n/config';
import { clientMessages } from '@/lib/i18n/messages';
import './globals.css';

// Self-hosted, so the Content-Security-Policy stays `font-src 'self'` and no visitor data goes to a font CDN.
const geist = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-geist',
  display: 'swap',
});
const serif = localFont({
  src: [
    { path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
});

// Every page is rendered per request: content is personalised (cart, account) and the CSP
// nonce added by src/proxy.ts must be applied to each response.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const site = localizedSettings(locale);
  const base = process.env.SITE_URL;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: `${site.site_name} | ${site.tagline}`, template: `%s | ${site.site_name}` },
    description: site.meta_description,
    icons: { icon: '/img/favicon.svg' },
    openGraph: {
      type: 'website',
      siteName: site.site_name,
      locale: INTL_TAG[locale].replace('-', '_'),
      images: [{ url: '/img/photos/hero-m.webp', width: 1200, height: 750 }],
    },
  };
}

export const viewport: Viewport = { themeColor: '#0a0f1a', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={INTL_TAG[locale]} className={`${geist.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans">
        <I18nProvider locale={locale} messages={clientMessages[locale]}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}

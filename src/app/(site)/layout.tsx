import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { Flash } from '@/components/site/flash';
import { getI18n } from '@/lib/i18n/server';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <a href="#main" className="sr-only z-50 bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">{t('skip')}</a>
      <Header />
      <main id="main" className="min-h-[50vh]">
        <Flash className="mx-auto mt-4 max-w-[1320px] px-4 sm:px-6" />
        {children}
      </main>
      <Footer />
    </>
  );
}

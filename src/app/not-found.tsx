import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { getI18n } from '@/lib/i18n/server';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-xl justify-items-center gap-3 px-4 py-24 text-center">
        <p className="font-display text-[8rem] leading-none text-primary">404</p>
        <h1 className="font-display text-4xl">{t('notFound.title')}</h1>
        <p className="text-muted-foreground">{t('notFound.body')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button asChild variant="ink"><Link href="/">{t('common.home')}</Link></Button>
          <Button asChild variant="white"><Link href="/shop">{t('notFound.browse')}</Link></Button>
        </div>
      </main>
      <Footer />
    </>
  );
}

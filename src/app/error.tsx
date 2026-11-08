'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';

// Shown for unexpected server errors. Details stay in the server log, never in the browser.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto grid max-w-xl justify-items-center gap-3 px-4 py-24 text-center">
      <p className="font-display text-7xl text-primary">{t('error.oops')}</p>
      <h1 className="font-display text-4xl">{t('error.title')}</h1>
      <p className="text-muted-foreground">{t('error.body')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button variant="ink" onClick={() => reset()}>{t('error.retry')}</Button>
        <Button asChild variant="white"><a href="/">{t('common.home')}</a></Button>
      </div>
    </main>
  );
}

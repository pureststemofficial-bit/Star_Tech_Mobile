import { setLocale } from '@/actions/locale';
import { getI18n } from '@/lib/i18n/server';
import { LOCALES } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

/** EN | PT toggle. A plain form post, so it works before (or without) JavaScript. */
export async function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = await getI18n();
  return (
    <form action={setLocale} role="group" aria-label={t('lang.label')} className={cn('inline-flex rounded-full border border-white/20 p-0.5', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          lang={l}
          aria-label={`${l.toUpperCase()} – ${t(`lang.${l}`)}`}
          aria-pressed={locale === l}
          className={cn(
            'grid h-8 min-w-9 place-items-center rounded-full px-2 text-[11px] font-semibold tracking-wider uppercase transition-colors duration-300',
            locale === l ? 'bg-white text-ink' : 'text-white/75 hover:text-white',
          )}
        >
          {l}
        </button>
      ))}
    </form>
  );
}

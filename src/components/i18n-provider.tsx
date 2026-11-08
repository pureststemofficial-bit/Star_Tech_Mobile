'use client';

import { createContext, useContext, useMemo } from 'react';
import { format, type ClientKey } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/config';
import { formatDate, money } from '@/lib/format';

const I18nContext = createContext<{ locale: Locale; messages: Record<ClientKey, string> } | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Record<ClientKey, string>; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Client-side translator. Only keys in the `client` dictionary are available in the browser. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  const { locale, messages } = ctx;
  return {
    locale,
    t: (key: ClientKey, vars?: Record<string, string | number>) => format(messages[key], vars),
    money: (pence: number | null | undefined) => money(pence, locale),
    date: (sql: string | null | undefined, withTime = false) => formatDate(sql, withTime, locale),
  };
}

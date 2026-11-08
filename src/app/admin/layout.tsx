import { I18nProvider } from '@/components/i18n-provider';
import { clientMessages } from '@/lib/i18n/messages';

/** The admin panel stays in English whichever language the storefront is being browsed in. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="en" messages={clientMessages.en}>{children}</I18nProvider>;
}

import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Container } from '@/components/site/container';
import { PageBanner } from '@/components/site/bits';
import { sendMessage } from '@/actions/forms';
import { localizedSettings } from '@/lib/store';
import { currentUser } from '@/lib/auth';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('contact.title');

export default async function ContactPage() {
  const { t, locale } = await getI18n();
  const site = localizedSettings(locale);
  const user = await currentUser();
  const items = [
    { Icon: MapPin, title: t('contact.visit'), body: site.address },
    { Icon: Phone, title: t('contact.call'), body: <a href={`tel:${site.phone.replace(/[^+0-9]/g, '')}`} className="link-grow py-1">{site.phone}</a> },
    { Icon: Mail, title: t('contact.email'), body: <a href={`mailto:${site.email}`} className="link-grow py-1 break-all">{site.email}</a> },
    { Icon: Clock, title: t('contact.hours'), body: site.hours },
  ];

  return (
    <>
      <PageBanner title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <Container className="mt-12 grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <ul className="grid gap-8 sm:grid-cols-2">
          {items.map(({ Icon, title, body }) => (
            <li key={title}>
              <Icon className="mb-3 size-6 stroke-[1.4] text-primary" aria-hidden="true" />
              <strong className="block font-medium">{title}</strong>
              <span className="mt-1 block text-[15px] whitespace-pre-line text-muted-foreground">{body}</span>
            </li>
          ))}
        </ul>
        <Card>
          <CardHeader><CardTitle>{t('contact.form')}</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={sendMessage} className="grid gap-4">
              <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
                <label>{t('form.website')} <input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <Field label={t('form.name')} htmlFor="name"><Input id="name" name="name" defaultValue={user?.name} autoComplete="name" required maxLength={100} /></Field>
              <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" defaultValue={user?.email} autoComplete="email" required maxLength={254} /></Field>
              <Field label={t('form.phone')} htmlFor="phone" optional><Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={20} /></Field>
              <Field label={t('form.message')} htmlFor="message"><Textarea id="message" name="message" required minLength={10} maxLength={3000} className="min-h-32" /></Field>
              <SubmitButton size="lg" variant="ink" className="w-full">{t('contact.send')}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </Container>
      <Container className="mt-14">
        <h2 className="font-display mb-5 text-4xl">{t('contact.map')}</h2>
        <iframe
          title={t('contact.mapTitle')}
          loading="lazy"
          referrerPolicy="no-referrer"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(site.map_query)}&z=15&hl=${locale}&output=embed`}
          className="h-80 w-full rounded-[1.75rem] border-0 bg-muted"
        />
      </Container>
    </>
  );
}

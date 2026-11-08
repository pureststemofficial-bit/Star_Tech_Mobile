import { Award, ShieldCheck, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Container } from '@/components/site/container';
import { PageBanner } from '@/components/site/bits';
import { bookRepair } from '@/actions/forms';
import { localizedOptions, localizedSettings } from '@/lib/store';
import { currentUser } from '@/lib/auth';
import { lines } from '@/lib/format';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('meta.book');

export default async function RepairsPage() {
  const { t, locale } = await getI18n();
  const site = localizedSettings(locale);
  const user = await currentUser();
  const today = new Date().toISOString().slice(0, 10);
  const select = (id: string, placeholder: string, options: { value: string; label: string }[]) => (
    <NativeSelect id={id} name={id} required defaultValue="">
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </NativeSelect>
  );
  const plain = (s: string) => lines(s).map((v) => ({ value: v, label: v }));
  const step = (n: number, title: string) => (
    <h2 className="flex items-baseline gap-3 text-lg font-medium tracking-tight"><span className="font-display text-3xl text-primary">{n}</span>{title}</h2>
  );

  return (
    <>
      <PageBanner image="/img/photos/repairs.webp" title={site.repair_title} subtitle={<><strong className="font-medium text-white">{site.repair_subtitle}</strong> {site.repair_text}</>}>
        <div className="hero-rise mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/85" style={{ '--i': 2 } as React.CSSProperties}>
          <span className="inline-flex items-center gap-2"><Award className="size-4 text-sky" /> {t('repairs.expert')}</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-sky" /> {t('repairs.parts')}</span>
          <span className="inline-flex items-center gap-2"><Zap className="size-4 text-sky" /> {t('repairs.quick')}</span>
        </div>
      </PageBanner>

      <Container className="mt-12">
        <ActionForm action={bookRepair} className="grid gap-10 lg:grid-cols-3">
          {/* Honeypot: hidden from people, irresistible to spam bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
            <label>{t('form.website')} <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <section className="grid content-start gap-4">
            {step(1, t('repairs.step1'))}
            <Field label={t('repairs.deviceType')} htmlFor="device_type">{select('device_type', t('repairs.selectDevice'), localizedOptions('repair_device_types', locale))}</Field>
            <Field label={t('repairs.brand')} htmlFor="brand">{select('brand', t('repairs.selectBrand'), plain(site.repair_brands))}</Field>
            <Field label={t('repairs.model')} htmlFor="model"><Input id="model" name="model" placeholder={t('repairs.modelPlaceholder')} required maxLength={80} /></Field>
          </section>
          <section className="grid content-start gap-4">
            {step(2, t('repairs.step2'))}
            <RadioGroup name="repair_type" required className="gap-2">
              {localizedOptions('repair_types', locale).map((o, i) => (
                <Label key={o.value} htmlFor={`rt${i}`} className="min-h-13 cursor-pointer rounded-2xl border bg-card px-4 py-3 font-normal transition-colors duration-300 has-[[data-state=checked]]:border-ink">
                  <RadioGroupItem id={`rt${i}`} value={o.value} />{o.label}
                </Label>
              ))}
            </RadioGroup>
          </section>
          <section className="grid content-start gap-4">
            {step(3, t('repairs.step3'))}
            <Field label={t('form.fullName')} htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={user?.name} autoComplete="name" required maxLength={100} /></Field>
            <Field label={t('form.phone')} htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user?.phone} autoComplete="tel" required maxLength={20} /></Field>
            <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" defaultValue={user?.email} autoComplete="email" required maxLength={254} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('repairs.date')} htmlFor="preferred_date"><Input id="preferred_date" name="preferred_date" type="date" min={today} required /></Field>
              <Field label={t('repairs.time')} htmlFor="preferred_time">{select('preferred_time', t('repairs.selectTime'), plain(site.repair_times))}</Field>
            </div>
            <Field label={t('repairs.info')} htmlFor="details"><Textarea id="details" name="details" maxLength={2000} placeholder={t('repairs.infoPlaceholder')} /></Field>
            <SubmitButton size="lg" variant="ink" className="w-full">{t('repairs.submit')}</SubmitButton>
          </section>
        </ActionForm>
      </Container>
    </>
  );
}

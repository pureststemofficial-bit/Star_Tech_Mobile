import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Container } from '@/components/site/container';
import { Row } from '@/components/site/order-detail';
import { placeOrder } from '@/actions/shop';
import { readSession } from '@/lib/session';
import { currentUser } from '@/lib/auth';
import { summary } from '@/lib/cart';
import { localizedOptions } from '@/lib/store';
import { stripeEnabled } from '@/lib/config';
import { get } from '@/lib/db';
import { getI18n, titled } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';
import type { Address } from '@/lib/types';

export const generateMetadata = titled('checkout.title');

export default async function CheckoutPage() {
  const cart = summary((await readSession())?.data);
  if (!cart.lines.length) redirect('/cart');
  const { t, locale, money } = await getI18n();
  const user = await currentUser();
  const addr = user
    ? get<Address>('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC LIMIT 1', user.id)
    : undefined;
  const methods = localizedOptions('payment_methods', locale);
  const heading = 'text-lg font-medium tracking-tight';

  return (
    <Container>
      <nav aria-label={t('product.breadcrumb')} className="flex gap-1.5 py-5 text-[13px] text-muted-foreground">
        <Link href="/cart" className="link-grow py-1">{t('checkout.basket')}</Link><span aria-hidden="true" className="py-1">/</span><span aria-current="page" className="py-1 text-foreground">{t('checkout.title')}</span>
      </nav>
      <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-none">{t('checkout.title')}</h1>
      {!user ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('checkout.haveAccount')} <Link className="font-medium text-primary hover:underline" href="/account/login?next=/checkout">{t('checkout.signIn')}</Link> {t('checkout.signInSuffix')}
        </p>
      ) : null}
      <ActionForm action={placeOrder} className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-9">
          <section className="grid gap-4">
            <h2 className={heading}>{t('checkout.contact')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" defaultValue={user?.email} autoComplete="email" required maxLength={254} /></Field>
              <Field label={t('form.phone')} htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={addr?.phone || user?.phone} autoComplete="tel" required maxLength={20} /></Field>
            </div>
          </section>
          <section className="grid gap-4">
            <h2 className={heading}>{t('checkout.address')}</h2>
            <Field label={t('form.fullName')} htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={addr?.full_name || user?.name} autoComplete="name" required maxLength={100} /></Field>
            <Field label={t('form.line1')} htmlFor="line1"><Input id="line1" name="line1" defaultValue={addr?.line1} autoComplete="address-line1" required maxLength={120} /></Field>
            <Field label={t('form.line2')} htmlFor="line2" optional><Input id="line2" name="line2" defaultValue={addr?.line2} autoComplete="address-line2" maxLength={120} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('form.city')} htmlFor="city"><Input id="city" name="city" defaultValue={addr?.city} autoComplete="address-level2" required maxLength={60} /></Field>
              <Field label={t('form.postcode')} htmlFor="postcode"><Input id="postcode" name="postcode" defaultValue={addr?.postcode} autoComplete="postal-code" required maxLength={10} /></Field>
            </div>
            <Field label={t('form.notes')} htmlFor="notes" optional><Textarea id="notes" name="notes" maxLength={500} /></Field>
          </section>
          <section className="grid gap-3">
            <h2 className={heading}>{t('checkout.payment')}</h2>
            <RadioGroup name="payment_method" defaultValue={methods[0]?.value} className="gap-2">
              {methods.map((m, i) => (
                <Label key={m.value} htmlFor={`pm${i}`} className="min-h-13 cursor-pointer rounded-2xl border bg-card px-4 py-3 font-normal transition-colors duration-300 has-[[data-state=checked]]:border-ink">
                  <RadioGroupItem id={`pm${i}`} value={m.value} />{m.label}
                </Label>
              ))}
            </RadioGroup>
            <p className="text-sm text-muted-foreground">{t(stripeEnabled() ? 'checkout.paymentNoteCard' : 'checkout.paymentNote')}</p>
          </section>
        </div>

        <Card className="lg:sticky lg:top-40">
          <CardHeader><CardTitle>{t('basket.summary')}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <ul className="divide-y">
              {cart.lines.map((l) => (
                <li key={`${l.product.id}-${l.variant}`} className="flex items-center gap-3 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.product.thumb || '/img/products/placeholder.svg'} alt="" width={52} height={52} className="size-13 rounded-xl bg-muted object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{pick(l.product, 'name', locale)}</p>
                    <p className="text-xs text-muted-foreground">{l.variant} × {l.qty}</p>
                  </div>
                  <span className="tabular-nums">{money(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <Row label={t('order.subtotal')} value={money(cart.subtotal)} />
            <Row label={t('order.delivery')} value={cart.delivery ? money(cart.delivery) : t('order.free')} />
            <Row label={t('order.total')} value={money(cart.total)} strong />
            <label className="flex min-h-11 items-center gap-2.5 py-1">
              <Checkbox name="agree" required />
              <span>{t('checkout.agree')} <Link href="/terms" target="_blank" className="text-primary underline">{t('checkout.terms')}</Link></span>
            </label>
            <SubmitButton size="lg" variant="ink" className="w-full"><Lock /> {t('checkout.place')}</SubmitButton>
            <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" /> {t('checkout.secureNote')}</p>
          </CardContent>
        </Card>
      </ActionForm>
    </Container>
  );
}

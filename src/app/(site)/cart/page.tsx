import Link from 'next/link';
import { ArrowRight, CreditCard, Lock, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/site/container';
import { Row } from '@/components/site/order-detail';
import { CartLineControls } from '@/components/shop/cart-line-controls';
import { ProductGrid } from '@/components/site/product-card';
import { SectionHeading } from '@/components/site/bits';
import { readSession } from '@/lib/session';
import { summary } from '@/lib/cart';
import { featured } from '@/lib/catalog';
import { getI18n, titled } from '@/lib/i18n/server';
import { pick } from '@/lib/i18n/config';

export const generateMetadata = titled('basket.title');

export default async function CartPage() {
  const { t, locale, money } = await getI18n();
  const cart = summary((await readSession())?.data);
  const inCart = new Set(cart.lines.map((l) => l.product.id));
  const suggestions = featured(12).filter((p) => !inCart.has(p.id)).slice(0, 4);

  return (
    <Container className="pt-10">
      <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-none">
        {t('basket.title')} <span className="font-sans text-base text-muted-foreground">{cart.count === 1 ? t('basket.item') : t('basket.items', { n: cart.count })}</span>
      </h1>

      {!cart.lines.length ? (
        <div className="mt-10 grid justify-items-center rounded-[1.75rem] bg-muted px-6 py-20 text-center">
          <ShoppingBag className="mb-4 size-9 stroke-[1.2] text-muted-foreground" aria-hidden="true" />
          <p className="font-display text-3xl">{t('basket.empty')}</p>
          <p className="mt-2 mb-6 text-muted-foreground">{t('basket.emptySub')}</p>
          <Button asChild variant="ink"><Link href="/shop">{t('basket.start')}</Link></Button>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y border-y">
            {cart.lines.map((l, i) => {
              const name = pick(l.product, 'name', locale);
              return (
                <li key={`${l.product.id}-${l.variant}`} className="grid grid-cols-[88px_1fr_auto] items-start gap-4 py-5 sm:grid-cols-[120px_1fr_auto]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.product.thumb || '/img/products/placeholder.svg'} alt="" width={120} height={120} className="aspect-square w-full rounded-2xl bg-muted object-cover" />
                  <div className="min-w-0">
                    <Link href={`/product/${l.product.slug}`} className="link-grow">{name}</Link>
                    {l.variant ? <p className="text-sm text-muted-foreground">{l.variant}</p> : null}
                    <p className="text-sm text-muted-foreground">{t('basket.each', { amount: money(l.unit) })}</p>
                    {!l.inStock ? <p className="text-sm font-medium text-destructive">{t('basket.onlyStock', { n: l.product.stock })}</p> : null}
                    <CartLineControls index={i} qty={l.qty} name={name} />
                  </div>
                  <strong className="text-right font-medium tabular-nums">{money(l.lineTotal)}</strong>
                </li>
              );
            })}
          </ul>

          <Card className="lg:sticky lg:top-40">
            <CardHeader><CardTitle>{t('basket.summary')}</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label={t('order.subtotal')} value={money(cart.subtotal)} />
              <Row label={t('order.delivery')} value={cart.delivery ? money(cart.delivery) : t('order.free')} />
              {cart.freeDeliveryRemaining > 0 ? (
                <Alert className="my-1"><AlertDescription>{t('basket.addMore', { amount: money(cart.freeDeliveryRemaining) })}</AlertDescription></Alert>
              ) : null}
              <Row label={t('order.total')} value={money(cart.total)} strong />
              <Button asChild size="lg" variant="ink" className="mt-3 w-full"><Link href="/checkout">{t('basket.checkout')} <ArrowRight /></Link></Button>
              <ul className="mt-4 grid gap-3">
                <li className="flex gap-3"><Lock className="size-5 shrink-0 stroke-[1.5] text-primary" /><div><strong className="font-medium">{t('basket.secure')}</strong><p className="text-muted-foreground">{t('basket.secureSub')}</p></div></li>
                <li className="flex gap-3"><CreditCard className="size-5 shrink-0 stroke-[1.5] text-primary" /><div><strong className="font-medium">{t('basket.options')}</strong><p className="text-muted-foreground">{t('basket.optionsSub')}</p></div></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {suggestions.length ? (
        <section className="pt-20">
          <SectionHeading title={t('product.related')} />
          <ProductGrid products={suggestions} cols={4} />
        </section>
      ) : null}
    </Container>
  );
}

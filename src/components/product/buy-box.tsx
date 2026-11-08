'use client';

import { startTransition, useActionState, useState } from 'react';
import { Loader2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { addToCart } from '@/actions/shop';
import { useCartToast } from '@/components/site/add-to-cart';
import { cn } from '@/lib/utils';

interface Props {
  productId: number;
  basePrice: number;
  comparePrice: number;
  inStock: boolean;
  colours: { name: string; hex: string }[];
  options: { name: string; extraPence: number }[];
}

/** Colour swatches, storage options, quantity and "Add to basket" (price updates live). */
export function BuyBox({ productId, basePrice, comparePrice, inStock, colours, options }: Props) {
  const { t, money } = useI18n();
  const [state, formAction, pending] = useActionState(addToCart, {});
  const [colour, setColour] = useState(colours[0]?.name ?? '');
  const [option, setOption] = useState(options[0]?.name ?? '');
  const [qty, setQty] = useState(1);
  useCartToast(state);

  const extra = options.find((o) => o.name === option)?.extraPence ?? 0;
  const price = basePrice + extra;
  const stepper = 'grid size-11 place-items-center transition-colors hover:bg-muted';

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
      className="grid gap-6"
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-baseline gap-3" aria-live="polite">
        <strong key={price} className="page-enter text-3xl font-medium tabular-nums">{money(price)}</strong>
        {comparePrice > basePrice ? <s className="text-muted-foreground tabular-nums">{money(comparePrice + extra)}</s> : null}
      </div>

      {colours.length ? (
        <fieldset>
          <legend className="mb-2.5 text-sm">
            {t('product.colour')}: <span className="text-muted-foreground">{colour}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <label key={c.name} title={c.name} className="cursor-pointer">
                <input type="radio" name="colour" value={c.name} checked={colour === c.name} onChange={() => setColour(c.name)} className="peer sr-only" />
                <svg viewBox="0 0 30 30" aria-hidden="true"
                  className="size-11 rounded-full border-2 border-transparent p-[3px] transition-colors duration-300 peer-checked:border-ink peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
                  <circle cx="15" cy="15" r="14" fill={c.hex} stroke="#0000001f" />
                </svg>
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {options.length ? (
        <fieldset>
          <legend className="mb-2.5 text-sm">{t('product.option')}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <label key={o.name} className="cursor-pointer">
                <input type="radio" name="option" value={o.name} checked={option === o.name} onChange={() => setOption(o.name)} className="peer sr-only" />
                <span className="grid h-11 place-items-center rounded-full border px-5 text-sm transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
                  {o.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex items-center overflow-hidden rounded-full border bg-card">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t('cart.qtyDown')} className={stepper}><Minus className="size-4" /></button>
          <input
            name="qty"
            type="number"
            min={1}
            max={10}
            value={qty}
            onChange={(e) => setQty(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            aria-label={t('cart.qty')}
            className="w-9 bg-transparent text-center tabular-nums [appearance:textfield] outline-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label={t('cart.qtyUp')} className={stepper}><Plus className="size-4" /></button>
        </div>
        <Button type="submit" size="lg" variant="ink" className="min-w-48 flex-1" disabled={!inStock || pending}>
          {pending ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
          {inStock ? t('cart.add') : t('stock.out')}
        </Button>
      </div>
      <Button type="submit" name="buyNow" value="1" variant="white" size="lg" className={cn('-mt-3', !inStock && 'hidden')} disabled={pending}>
        {t('cart.buyNow')}
      </Button>
    </form>
  );
}

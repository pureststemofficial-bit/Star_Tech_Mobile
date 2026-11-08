'use client';

import { useOptimistic, useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { updateCartLine } from '@/actions/shop';
import { useI18n } from '@/components/i18n-provider';

/** Quantity stepper + remove link for one cart line. Updates the server cart immediately. */
export function CartLineControls({ index, qty, name }: { index: number; qty: number; name: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(qty);

  const change = (next: number) => {
    const fd = new FormData();
    fd.set('index', String(index));
    fd.set('qty', String(next));
    startTransition(async () => {
      setShown(next);
      await updateCartLine(fd);
    });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3" aria-busy={pending}>
      <form action={updateCartLine} className="inline-flex overflow-hidden rounded-full border bg-card">
        <input type="hidden" name="index" value={index} />
        <button type="button" disabled={shown <= 1} onClick={() => change(shown - 1)} aria-label={t('cart.qtyDown')}
          className="grid w-11 h-11 place-items-center hover:bg-muted disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <input name="qty" type="number" min={1} max={10} value={shown} readOnly aria-label={t('cart.qtyFor', { name })}
          className="w-9 text-center text-sm [appearance:textfield] outline-none [&::-webkit-inner-spin-button]:appearance-none" />
        <button type="button" disabled={shown >= 10} onClick={() => change(shown + 1)} aria-label={t('cart.qtyUp')}
          className="grid w-11 h-11 place-items-center hover:bg-muted disabled:opacity-40">
          <Plus className="size-4" />
        </button>
      </form>
      <form action={updateCartLine}>
        <input type="hidden" name="index" value={index} />
        <button type="submit" name="remove" value="1" className="link-grow py-2.5 text-sm text-muted-foreground hover:text-foreground">{t('cart.remove')}</button>
      </form>
    </div>
  );
}

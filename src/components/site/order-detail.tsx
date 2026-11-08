'use client';

import { Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/components/i18n-provider';
import type { ClientKey } from '@/lib/i18n/messages';
import { StatusBadge } from './bits';
import { cn } from '@/lib/utils';
import type { Order, OrderItem } from '@/lib/types';

const STEPS = ['processing', 'shipped', 'out_for_delivery', 'delivered'] as const;

/**
 * Order summary with the 4-step delivery tracker. `paymentLabel` is the payment method in the
 * visitor's language where the page can work that out; the stored value is the English one.
 */
export function OrderDetail({ order, items, paymentLabel }: { order: Order; items: OrderItem[]; paymentLabel?: string }) {
  const { t, money, date } = useI18n();
  const current = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{t('order.number', { number: order.order_number })}</p>
          <p className="text-sm text-muted-foreground">{t('order.placed', { date: date(order.created_at) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'cancelled' ? (
        <Alert variant="destructive"><AlertDescription>{t('order.cancelled')}</AlertDescription></Alert>
      ) : (
        <ol className="relative grid grid-cols-4" aria-label={t('order.progress')}>
          <span aria-hidden="true" className="absolute top-3.5 right-[12.5%] left-[12.5%] h-0.5 bg-border" />
          <span
            aria-hidden="true"
            className={cn('absolute top-3.5 left-[12.5%] h-0.5 bg-primary transition-all duration-700', ['w-0', 'w-1/4', 'w-1/2', 'w-3/4'][Math.max(0, current)])}
          />
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === current ? 'step' : undefined} className={cn('relative text-center text-xs', i <= current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              <span className={cn('mx-auto mb-1.5 grid size-7 place-items-center rounded-full border-2 bg-card', i <= current ? 'border-primary bg-primary text-white' : 'border-border')}>
                {i <= current ? <Check className="size-3.5" /> : null}
              </span>
              {t(`status.${s}` as ClientKey)}
            </li>
          ))}
        </ol>
      )}
      {order.tracking_number ? <p className="text-sm">{t('order.tracking')} <strong className="font-medium">{order.tracking_number}</strong></p> : null}

      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image || '/img/products/placeholder.svg'} alt="" width={56} height={56} loading="lazy" className="size-14 rounded-xl bg-muted object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{it.name}</p>
              <p className="text-xs text-muted-foreground">{it.variant} {t('order.qty', { n: it.qty })}</p>
            </div>
            <span className="text-sm tabular-nums">{money(it.price_pence * it.qty)}</span>
          </li>
        ))}
      </ul>
      <Separator />
      <div className="grid gap-1.5 text-sm">
        <Row label={t('order.subtotal')} value={money(order.subtotal_pence)} />
        <Row label={t('order.delivery')} value={order.delivery_pence ? money(order.delivery_pence) : t('order.free')} />
        <Row label={t('order.total')} value={money(order.total_pence)} strong />
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {t('order.payment', { method: paymentLabel || order.payment_method })} <StatusBadge status={order.payment_status} />
      </p>
      <p className="text-sm text-muted-foreground">
        {t('order.deliveringTo', { address: [order.full_name, order.line1, order.line2, order.city, order.postcode].filter(Boolean).join(', ') })}
      </p>
    </div>
  );
}

export function Row({ label: l, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', strong && 'mt-1 border-t pt-3 text-base font-medium')}>
      <span>{l}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

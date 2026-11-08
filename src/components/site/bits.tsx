'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/i18n-provider';
import type { ClientKey } from '@/lib/i18n/messages';
import { label } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Stars({ rating, count, className }: { rating: number; count?: number; className?: string }) {
  const { t } = useI18n();
  const full = Math.round(rating);
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs', className)} role="img" aria-label={t('rating.aria', { rating: rating.toFixed(1) })}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-3.5', i < full ? 'fill-star text-star' : 'fill-muted text-muted')} aria-hidden="true" />
      ))}
      {count !== undefined ? <span className="ml-1 text-muted-foreground">({count})</span> : null}
    </span>
  );
}

export function Price({ price, compare, size = 'md' }: { price: number; compare?: number; size?: 'md' | 'lg' }) {
  const { money } = useI18n();
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <strong className={cn('font-medium tabular-nums', size === 'lg' ? 'text-3xl' : 'text-[15px]')}>{money(price)}</strong>
      {compare && compare > price ? <s className="text-sm text-muted-foreground tabular-nums">{money(compare)}</s> : null}
    </div>
  );
}

const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  processing: 'secondary', new: 'secondary',
  shipped: 'warning', out_for_delivery: 'warning', confirmed: 'warning', in_progress: 'warning',
  delivered: 'success', completed: 'success', paid: 'success', active: 'success', approved: 'success',
  cancelled: 'destructive', unpaid: 'destructive', refunded: 'destructive', disabled: 'destructive', hidden: 'destructive',
  pending: 'secondary',
};

const STATUS_KEYS = new Set(['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'unpaid', 'paid', 'refunded', 'new', 'confirmed', 'in_progress', 'completed']);

/** Coloured pill for order / repair / payment statuses. Always shows the text label too. */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>{STATUS_KEYS.has(status) ? t(`status.${status}` as ClientKey) : label(status)}</Badge>;
}

/** Full-width dark page header, optionally over a photograph. */
export function PageBanner({ title, subtitle, image, children }: { title: React.ReactNode; subtitle?: React.ReactNode; image?: string; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" width={2000} height={800} fetchPriority="high" className="hero-settle absolute inset-0 -z-20 size-full object-cover opacity-55" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
        </>
      ) : null}
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 md:py-20">
        <h1 className="hero-rise font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.04]">{title}</h1>
        {subtitle ? <p className="hero-rise mt-3 max-w-xl text-base text-white/80 md:text-lg" style={{ '--i': 1 } as React.CSSProperties}>{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="reveal mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-2 text-muted-foreground">{eyebrow}</p> : null}
        <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

export function Gallery({ name, images }: { name: string; images: { path: string; thumb: string }[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const main = images[active]?.path ?? '/img/products/placeholder.svg';
  return (
    <div className="grid gap-3 lg:sticky lg:top-40">
      <div className="aspect-square overflow-hidden rounded-[1.75rem] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={main} src={main} alt={name} width={1200} height={1200} fetchPriority="high" className="page-enter size-full object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2.5 overflow-x-auto p-0.5">
          {images.map((img, i) => (
            <button
              key={img.path}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t('product.showImage', { n: i + 1 })}
              aria-current={i === active}
              className={cn('size-[76px] shrink-0 overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-background transition-all duration-300', i === active ? 'ring-ink' : 'ring-transparent hover:ring-border')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="" width={76} height={76} loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/components/i18n-provider';

interface FilterProps {
  q: string;
  sort: string;
  selected: { categories: string[]; prices: string[]; brands: string[] };
  categories: { slug: string; name: string; product_count: number }[];
  priceRanges: readonly { id: string; label: string }[];
  brands: { brand: string; n: number }[];
}

/** Sidebar filters. A plain GET form (works without JS); with JS it applies on every change. */
export function ShopFilters({ q, sort, selected, categories, priceRanges, brands }: FilterProps) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) detailsRef.current?.removeAttribute('open');
  }, []);
  const submit = () => formRef.current?.requestSubmit();
  const hasFilters = selected.categories.length || selected.prices.length || selected.brands.length || q;

  const group = (title: string, name: string, items: { value: string; label: string; count?: number }[], picked: string[]) => (
    <div className="grid gap-1 py-5">
      <h2 className="eyebrow mb-1.5 text-[11px] text-muted-foreground">{title}</h2>
      {items.map((it) => (
        <label key={it.value} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox name={name} value={it.value} defaultChecked={picked.includes(it.value)} onCheckedChange={submit} />
          <span className="flex-1">{it.label}</span>
          {it.count !== undefined ? <span className="text-xs text-muted-foreground tabular-nums">{it.count}</span> : null}
        </label>
      ))}
    </div>
  );

  return (
    <details ref={detailsRef} open className="group lg:sticky lg:top-40">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium lg:pointer-events-none [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4" /> {t('filters.title')}
      </summary>
      <Form ref={formRef} action="/shop">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        <input type="hidden" name="sort" value={sort} />
        <Separator className="mt-2" />
        {group(t('filters.categories'), 'category', categories.map((c) => ({ value: c.slug, label: c.name, count: c.product_count })), selected.categories)}
        <Separator />
        {group(t('filters.price'), 'price', priceRanges.map((r) => ({ value: r.id, label: r.label })), selected.prices)}
        <Separator />
        {group(t('filters.brand'), 'brand', brands.map((b) => ({ value: b.brand, label: b.brand, count: b.n })), selected.brands)}
        <noscript><Button type="submit" variant="ink" className="w-full">{t('filters.apply')}</Button></noscript>
        {hasFilters ? (
          <p className="mt-2 text-sm"><Link href="/shop" className="link-grow inline-block py-2 text-primary">{t('filters.clear')}</Link></p>
        ) : null}
      </Form>
    </details>
  );
}

export function SortSelect({ sort, hidden }: { sort: string; hidden: [string, string][] }) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Form ref={formRef} action="/shop" className="flex items-center gap-2">
      {hidden.map(([k, v], i) => <input key={`${k}${i}`} type="hidden" name={k} value={v} />)}
      <label htmlFor="sort" className="text-sm whitespace-nowrap text-muted-foreground">{t('sort.label')}</label>
      <NativeSelect id="sort" name="sort" defaultValue={sort} onChange={() => formRef.current?.requestSubmit()} className="w-auto max-w-[11.5rem] truncate rounded-full sm:max-w-none">
        <option value="popular">{t('sort.popular')}</option>
        <option value="newest">{t('sort.newest')}</option>
        <option value="price_asc">{t('sort.price_asc')}</option>
        <option value="price_desc">{t('sort.price_desc')}</option>
        <option value="rating">{t('sort.rating')}</option>
      </NativeSelect>
      <noscript><Button type="submit" size="sm">{t('sort.go')}</Button></noscript>
    </Form>
  );
}

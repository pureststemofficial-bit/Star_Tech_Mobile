'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { saveDeliveryFees } from '@/actions/admin';
import { cn } from '@/lib/utils';

/*
 * Admin -> Delivery. Every city has its own charge field; leaving it blank uses the default charge.
 * "Apply to all" fills a whole district at once. Nothing is saved until "Save delivery charges".
 */

type Groups = { district: string; cities: { id: number; name: string; fee: string }[] }[];

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function DeliveryFeesForm({ groups, defaultFee, freeOver }: { groups: Groups; defaultFee: string; freeOver: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [districtFee, setDistrictFee] = useState<Record<string, string>>({});
  const q = fold(query.trim());

  const toggle = (district: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(district)) next.delete(district); else next.add(district);
      return next;
    });

  // Fill every city field in the district (the fields are uncontrolled, so set them directly).
  const applyToDistrict = (district: string, el: HTMLElement) => {
    const value = (districtFee[district] ?? '').trim();
    el.closest('[data-district]')?.querySelectorAll<HTMLInputElement>('input[data-city]').forEach((input) => { input.value = value; });
    setOpen((prev) => new Set(prev).add(district));
  };

  return (
    <ActionForm action={saveDeliveryFees} toastOnSuccess className="grid gap-5">
      <Card>
        <CardHeader><CardTitle className="text-base">Default charges</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Default delivery charge (€)" htmlFor="default_fee" hint="Used for any city without its own charge below.">
            <Input id="default_fee" name="default_fee" inputMode="decimal" defaultValue={defaultFee} required />
          </Field>
          <Field label="Free delivery over (€)" htmlFor="free_over" hint="0 = delivery is always charged.">
            <Input id="free_over" name="free_over" inputMode="decimal" defaultValue={freeOver} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Charge by city</CardTitle>
          <p className="text-sm text-muted-foreground">
            Customers choose their town or city at checkout and pay the charge set here. Leave a city blank to use the default charge; enter 0 for free delivery there.
          </p>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a city or district" aria-label="Find a city or district" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {groups.map(({ district, cities }) => {
            const districtMatch = q !== '' && fold(district).includes(q);
            const matches = q === '' || districtMatch ? cities : cities.filter((c) => fold(c.name).includes(q));
            const expanded = open.has(district) || (q !== '' && matches.length > 0);
            const custom = cities.filter((c) => c.fee !== '').length;
            const panelId = `district-${district.replace(/\W+/g, '-')}`;
            return (
              // Hidden rather than removed while searching, so every field is still submitted.
              <section key={district} data-district={district} hidden={matches.length === 0} className="rounded-xl border">
                <button type="button" onClick={() => toggle(district)} aria-expanded={expanded} aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <span>
                    <strong className="font-semibold">{district}</strong>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {cities.length} {cities.length === 1 ? 'city' : 'cities'}{custom ? ` · ${custom} with their own charge` : ''}
                    </span>
                  </span>
                  <ChevronDown className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                </button>
                <div id={panelId} hidden={!expanded} className="grid gap-4 border-t px-4 py-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label={`Set every city in ${district} (€)`} htmlFor={`${panelId}-all`} className="w-48">
                      <Input id={`${panelId}-all`} inputMode="decimal" placeholder="e.g. 4.99" value={districtFee[district] ?? ''}
                        onChange={(e) => setDistrictFee((prev) => ({ ...prev, [district]: e.target.value }))} />
                    </Field>
                    <Button type="button" variant="white" onClick={(e) => applyToDistrict(district, e.currentTarget)}>Apply to all</Button>
                  </div>
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                    {cities.map((c) => (
                      <label key={c.id} hidden={!matches.includes(c)} className="flex items-center justify-between gap-3 text-sm">
                        <span>{c.name}</span>
                        <Input name={`fee_${c.id}`} data-city defaultValue={c.fee} inputMode="decimal" placeholder={`Default (${defaultFee})`}
                          aria-label={`Delivery charge for ${c.name} (€)`} className="h-9 w-32 text-right" />
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <SubmitButton size="lg" className="shadow-lg">Save delivery charges</SubmitButton>
      </div>
    </ActionForm>
  );
}

'use client';

import { createContext, useContext, useState } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
import { Row } from '@/components/site/order-detail';
import { useI18n } from '@/components/i18n-provider';
import { deliveryCharge } from '@/lib/delivery-charge';

/*
 * The city picker and the delivery/total rows on the checkout page share the chosen city, so the
 * summary updates as soon as the customer picks one. The server works the charge out again when
 * the order is placed; these figures are only for display.
 */

type Groups = { district: string; cities: { name: string; fee: number }[] }[];
type Ctx = { city: string; setCity: (c: string) => void; fees: Map<string, number> };

const DeliveryContext = createContext<Ctx | null>(null);
const useDelivery = () => useContext(DeliveryContext)!;

export function DeliveryProvider({ groups, initialCity, children }: { groups: Groups; initialCity: string; children: React.ReactNode }) {
  const [city, setCity] = useState(initialCity);
  const [fees] = useState(() => new Map(groups.flatMap((g) => g.cities.map((c) => [c.name, c.fee] as const))));
  return <DeliveryContext.Provider value={{ city, setCity, fees }}>{children}</DeliveryContext.Provider>;
}

export function CitySelect({ id, groups }: { id: string; groups: Groups }) {
  const { t } = useI18n();
  const { city, setCity } = useDelivery();
  return (
    <NativeSelect id={id} name="city" required autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)}>
      <option value="" disabled>{t('checkout.chooseCity')}</option>
      {groups.map((g) => (
        <optgroup key={g.district} label={g.district}>
          {g.cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </optgroup>
      ))}
    </NativeSelect>
  );
}

export function DeliveryTotals({ subtotal, freeOver }: { subtotal: number; freeOver: number }) {
  const { t, money } = useI18n();
  const { city, fees } = useDelivery();
  const fee = fees.get(city);
  if (fee === undefined) {
    return (
      <>
        <Row label={t('order.delivery')} value={<span className="text-muted-foreground">{t('checkout.chooseCityFirst')}</span>} />
        <Row label={t('order.total')} value={money(subtotal)} strong />
      </>
    );
  }
  const delivery = deliveryCharge(subtotal, fee, freeOver);
  return (
    <>
      <Row label={`${t('order.delivery')} · ${city}`} value={delivery ? money(delivery) : t('order.free')} />
      <Row label={t('order.total')} value={money(subtotal + delivery)} strong />
    </>
  );
}

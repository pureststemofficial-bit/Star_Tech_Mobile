import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { DeliveryFeesForm } from '@/components/admin/delivery-fees-form';
import { requireAdmin } from '@/lib/auth';
import { citiesByDistrict } from '@/lib/delivery';
import { settings } from '@/lib/store';
import { fromPence } from '@/lib/format';

export const metadata: Metadata = { title: 'Delivery' };

export default async function DeliveryAdmin() {
  await requireAdmin();
  const s = settings();
  const groups = citiesByDistrict().map((g) => ({
    district: g.district,
    cities: g.cities.map((c) => ({ id: c.id, name: c.name, fee: c.fee_pence === null ? '' : fromPence(c.fee_pence) })),
  }));
  return (
    <>
      <PageHeader title="Delivery" description="Set the delivery charge for each town and city in Portugal." />
      <DeliveryFeesForm groups={groups} defaultFee={fromPence(s.deliveryFeePence)} freeOver={fromPence(s.freeDeliveryPence)} />
    </>
  );
}

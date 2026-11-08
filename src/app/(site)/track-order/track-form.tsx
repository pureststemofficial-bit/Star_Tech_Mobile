'use client';

import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { OrderDetail } from '@/components/site/order-detail';
import { trackOrder } from '@/actions/forms';
import { useI18n } from '@/components/i18n-provider';
import type { Order, OrderItem } from '@/lib/types';

export function TrackForm() {
  const { t } = useI18n();
  return (
    <ActionForm
      action={trackOrder}
      className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
      render={(state) => {
        const data = state.data as { order: Order; items: OrderItem[]; paymentLabel: string } | undefined;
        return data ? (
          <div className="mt-6 grid gap-6">
            <Separator />
            <OrderDetail order={data.order} items={data.items} paymentLabel={data.paymentLabel} />
          </div>
        ) : null;
      }}
    >
      <Field label={t('track.number')} htmlFor="number"><Input id="number" name="number" placeholder="SM241027123456" required maxLength={30} /></Field>
      <Field label={t('form.email')} htmlFor="email"><Input id="email" name="email" type="email" required maxLength={254} /></Field>
      <SubmitButton variant="ink">{t('track.submit')}</SubmitButton>
    </ActionForm>
  );
}

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/i18n-provider';
import { submitReview } from '@/actions/shop';
import { cn } from '@/lib/utils';

export function ReviewForm({ productId }: { productId: number }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <ActionForm action={submitReview} resetOnSuccess className="grid gap-4">
      <h3 className="text-lg font-medium">{t('review.write')}</h3>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="mb-2 text-sm">{t('review.rating')}</legend>
        <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} onMouseEnter={() => setHover(n)} className="grid size-11 cursor-pointer place-items-center">
              <input type="radio" name="rating" value={n} required checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <Star className={cn('size-7 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring', n <= (hover || rating) ? 'fill-star text-star' : 'fill-muted text-muted')} />
              <span className="sr-only">{t('review.stars', { n })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t('review.body')} htmlFor="rbody">
        <Textarea id="rbody" name="body" minLength={10} maxLength={2000} required />
      </Field>
      <div><SubmitButton variant="ink">{t('review.submit')}</SubmitButton></div>
    </ActionForm>
  );
}

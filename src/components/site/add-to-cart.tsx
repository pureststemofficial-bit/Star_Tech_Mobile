'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { addToCart } from '@/actions/shop';
import type { FormState } from '@/lib/types';

/** Shows a toast after the add-to-cart Server Action finishes (with a link to the basket). */
export function useCartToast(state: FormState) {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    if (!state.at) return;
    if (state.ok) toast.success(state.message, { action: { label: t('cart.view'), onClick: () => router.push('/cart') } });
    else if (state.errors?.length) toast.error(state.errors[0]);
    // `t` changes identity each render; the toast must only fire for a new result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);
}

/** Round quick-add button that sits on a product photo and opens into a label on hover. */
export function AddToCartButton({ productId, name }: { productId: number; name: string }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(addToCart, {});
  useCartToast(state);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t('cart.addNamed', { name })}
        className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_-8px_rgb(0_0_0/0.45)] transition-colors duration-300 hover:bg-ink hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Plus className="size-[18px]" />}
      </button>
    </form>
  );
}

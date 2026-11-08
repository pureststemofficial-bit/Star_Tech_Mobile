import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/forms/action-form';
import { ProductCard } from '@/components/site/product-card';
import { toggleWishlist } from '@/actions/shop';
import { requireUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { byIds } from '@/lib/catalog';
import { getI18n, titled } from '@/lib/i18n/server';

export const generateMetadata = titled('meta.wishlist');

export default async function WishlistPage() {
  const user = await requireUser('/account/wishlist');
  const { t } = await getI18n();
  const ids = all<{ product_id: number }>('SELECT product_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC', user.id).map((r) => r.product_id);
  const products = byIds(ids);
  return (
    <Card>
      <CardHeader><h1 className="font-display text-5xl leading-none">{t('wishlist.title')}</h1></CardHeader>
      <CardContent>
        {!products.length ? (
          <div className="grid justify-items-start gap-4">
            <p className="text-muted-foreground">{t('wishlist.empty')}</p>
            <Button asChild variant="ink"><Link href="/shop">{t('wishlist.browse')}</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="grid gap-1">
                <ProductCard p={p} />
                <form action={toggleWishlist} className="text-center">
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="back" value="/account/wishlist" />
                  <SubmitButton variant="link" size="sm">{t('wishlist.remove')}</SubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

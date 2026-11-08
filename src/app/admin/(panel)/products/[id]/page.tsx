import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { ProductForm } from '@/components/admin/product-form';
import { requireAdmin } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { categories } from '@/lib/store';
import { int } from '@/lib/validate';
import type { Product, ProductImage } from '@/lib/types';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const product = get<Product>('SELECT * FROM products WHERE id = ?', int((await params).id));
  if (!product) notFound();
  const images = all<ProductImage>('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id', product.id);
  return (
    <>
      <PageHeader
        title={`Edit: ${product.name}`}
        back={{ href: '/admin/products', label: 'All products' }}
        actions={<Button asChild variant="white"><a href={`/product/${product.slug}`} target="_blank" rel="noopener"><Eye />View on website</a></Button>}
      />
      {/* key resets the form's default values after each save */}
      <ProductForm key={product.updated_at + images.length} product={product} images={images} cats={categories()} />
    </>
  );
}

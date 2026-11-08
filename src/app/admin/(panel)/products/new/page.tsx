import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { ProductForm } from '@/components/admin/product-form';
import { requireAdmin } from '@/lib/auth';
import { categories } from '@/lib/store';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New product" back={{ href: '/admin/products', label: 'All products' }} />
      <ProductForm images={[]} cats={categories()} />
    </>
  );
}

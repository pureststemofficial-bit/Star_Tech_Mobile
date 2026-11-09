import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { BlogForm } from '@/components/admin/blog-form';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'New article' };

export default async function NewBlogPostPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New article" back={{ href: '/admin/blog', label: 'All articles' }} />
      <BlogForm />
    </>
  );
}

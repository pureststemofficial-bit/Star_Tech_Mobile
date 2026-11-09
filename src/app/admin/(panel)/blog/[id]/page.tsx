import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { BlogForm } from '@/components/admin/blog-form';
import { requireAdmin } from '@/lib/auth';
import { get } from '@/lib/db';
import { int } from '@/lib/validate';
import type { BlogPost } from '@/lib/types';

export const metadata: Metadata = { title: 'Edit article' };

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const post = get<BlogPost>('SELECT * FROM blog_posts WHERE id = ?', int((await params).id));
  if (!post) notFound();
  return (
    <>
      <PageHeader
        title={`Edit: ${post.title}`}
        back={{ href: '/admin/blog', label: 'All articles' }}
        actions={post.is_active ? <Button asChild variant="white"><a href={`/blog/${post.slug}`} target="_blank" rel="noopener"><Eye />View on website</a></Button> : undefined}
      />
      {/* key resets the form's default values after each save */}
      <BlogForm key={post.updated_at} post={post} />
    </>
  );
}

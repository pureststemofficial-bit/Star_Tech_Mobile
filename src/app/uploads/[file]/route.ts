import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadDir } from '@/lib/config';
import { UPLOAD_NAME } from '@/lib/images';

/*
 * Serves admin-uploaded images. Only file names we generated (UUID.webp) are accepted, so there
 * is no path traversal; files never change, so browsers can cache them forever.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!UPLOAD_NAME.test(file)) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(path.join(uploadDir, file));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

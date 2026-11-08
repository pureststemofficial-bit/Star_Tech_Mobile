import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { uploadDir } from './config.ts';

sharp.cache(false);

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'heif']);
export const UPLOAD_NAME = /^[0-9a-f-]{36}(-t)?\.webp$/;

export class ImageError extends Error {}

/** Files from a FormData field, ignoring the empty entry browsers send when nothing is chosen. */
export const filesFrom = (formData: FormData, field: string): File[] =>
  formData.getAll(field).filter((f): f is File => typeof f === 'object' && f !== null && f.size > 0);

/**
 * Decode the upload with sharp (rejects anything that isn't really an image, whatever its name or
 * mime type), then re-encode to WebP. Re-encoding strips EXIF/GPS metadata and any embedded
 * payloads, and produces small, fast-loading files in two sizes.
 */
export async function saveImage(file: File, { width = 1200, thumbWidth = 480 } = {}) {
  if (file.size > MAX_BYTES) throw new ImageError('That image is too large (max 8 MB).');
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.mkdirSync(uploadDir, { recursive: true });
  try {
    const meta = await sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' }).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new Error('format');
    const id = crypto.randomUUID();
    const base = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
    await Promise.all([
      base.clone().resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toFile(path.join(uploadDir, `${id}.webp`)),
      base.clone().resize({ width: thumbWidth, height: thumbWidth, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(path.join(uploadDir, `${id}-t.webp`)),
    ]);
    return { path: `/uploads/${id}.webp`, thumb: `/uploads/${id}-t.webp` };
  } catch {
    throw new ImageError('That file could not be processed as an image. Please upload a JPG, PNG or WebP.');
  }
}

/** Delete a previously uploaded file. Only touches files that match our generated names. */
export function removeUpload(webPath: string | null | undefined) {
  if (typeof webPath !== 'string' || !webPath.startsWith('/uploads/')) return;
  const name = webPath.slice('/uploads/'.length);
  if (!UPLOAD_NAME.test(name)) return;
  fs.rm(path.join(uploadDir, name), { force: true }, () => {});
}

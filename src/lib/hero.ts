import 'server-only';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const DIR = 'hero_section_img';
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Hero banner slides: every image in `public/hero_section_img`, in file-name order
 * (numbers sort naturally, so `2.jpg` comes before `10.jpg`). Drop a picture in the folder to add a slide.
 */
export function heroSlides(): string[] {
  try {
    return readdirSync(path.join(process.cwd(), 'public', DIR))
      .filter((f) => IMAGE.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `/${DIR}/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}

/*
 * A small PDF writer: text in Helvetica / Helvetica-Bold, lines and filled rectangles on A4 pages.
 * Enough for invoices without pulling in a PDF library. Text uses WinAnsiEncoding, which covers
 * Portuguese (á, ã, ç, õ...) and the euro sign; anything else is printed as "?".
 */

export const A4 = { width: 595.28, height: 841.89 };

type RGB = [number, number, number];
export interface TextOptions { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right' | 'center' }

// Glyph widths (per 1000 units of font size) for ASCII 32-126, from the standard Helvetica metrics.
const REGULAR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
  278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667,
  944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
  333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// WinAnsi codes for the characters outside Latin-1 that invoices are likely to contain.
const WIN_ANSI: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };

function encode(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 32 && code < 127) bytes.push(code);
    else if (WIN_ANSI[ch]) bytes.push(WIN_ANSI[ch]);
    else if (code === 0x202f || code === 0x2009 || code === 0x2007) bytes.push(32); // narrow spaces used by number formatting
    else if (code >= 0xa0 && code <= 0xff) bytes.push(code);
    else bytes.push(63); // ?
  }
  return bytes;
}

/** Width of `text` in points. Accented letters measure as their base letter. */
export function textWidth(text: string, size: number, bold = false) {
  const table = bold ? BOLD : REGULAR;
  let units = 0;
  for (const ch of text) {
    const base = ch === '€' ? '0' : ch.normalize('NFD')[0];
    const code = base.codePointAt(0)!;
    units += code >= 32 && code < 127 ? table[code - 32] : 556;
  }
  return (units / 1000) * size;
}

/** Shorten `text` with an ellipsis so it fits within `maxWidth`. */
export function fit(text: string, maxWidth: number, size: number, bold = false) {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && textWidth(`${s}…`, size, bold) > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const literal = (text: string) =>
  `(${encode(text).map((b) => (b === 40 || b === 41 || b === 92 ? `\\${String.fromCharCode(b)}` : b < 32 || b > 126 ? `\\${b.toString(8).padStart(3, '0')}` : String.fromCharCode(b))).join('')})`;

export class PdfPage {
  readonly ops: string[] = [];

  text(x: number, y: number, text: string, { size = 10, bold = false, color = [0, 0, 0], align = 'left' }: TextOptions = {}) {
    const w = align === 'left' ? 0 : textWidth(text, size, bold);
    const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    this.ops.push(`BT ${color.map(num).join(' ')} rg /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(left)} ${num(y)} Td ${literal(text)} Tj ET`);
  }

  line(x1: number, y1: number, x2: number, y2: number, { width = 0.5, color = [0.8, 0.8, 0.8] as RGB } = {}) {
    this.ops.push(`${color.map(num).join(' ')} RG ${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops.push(`${color.map(num).join(' ')} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`);
  }
}

/** Assemble pages into a PDF file. */
export function renderPdf(pages: PdfPage[], title: string): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body); // object number = index + 1
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // pages tree, filled in below once the page objects are numbered
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  add(`<< /Title ${literal(title)} /Producer (Startech Mobile) >>`);
  const kids: number[] = [];
  for (const page of pages) {
    const content = page.ops.join('\n');
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const contentId = objects.length;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    kids.push(objects.length);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  // Everything above is plain ASCII (non-ASCII text is octal-escaped), so string length = byte length.
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, 'latin1'));
}

/*
 * Minimal, XSS-safe text formatter for admin-edited pages, blog articles and product descriptions.
 * Everything is HTML-escaped first; only this small syntax is turned into markup:
 *   # Main heading   ## Heading   ### Subheading   #### Small heading
 *   - bullet     1. numbered      > quote          --- divider line      blank line = new paragraph
 *   **bold**     *italic*         ++underline++    ~~strikethrough~~     [text](/page)
 * Links must be a site path (/repairs), an http(s) URL, or mailto:/tel:; anything else stays as plain text.
 * The admin rich-text editor (components/admin/rich-text-editor.tsx) reads and writes this same syntax.
 */

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const SAFE_HREF = /^(?:\/(?!\/)|https?:\/\/|mailto:|tel:)/i;

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

// Runs on escaped text, so nothing here can produce markup other than these tags.
const marks = (s: string) => s
  .replace(/\*\*\*(?=\S)(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  .replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*\w])\*(?=[^\s*])(.+?)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/\+\+(?=\S)(.+?)\+\+/g, '<u>$1</u>')
  .replace(/~~(?=\S)(.+?)~~/g, '<s>$1</s>');

/** Formats one line of text: escaping, links, then bold / italic / underline / strikethrough. */
export function renderInline(text: string): string {
  // Links are swapped for placeholders first so the formatting rules never touch a URL.
  const links: string[] = [];
  const s = escapeHtml(text).replace(LINK, (whole, label: string, href: string) => {
    if (!SAFE_HREF.test(href)) return whole;
    const external = /^https?:/i.test(href);
    links.push(`<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${marks(label)}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  return marks(s).replace(/\u0000(\d+)\u0000/g, (_m, i: string) => links[Number(i)]);
}

export function render(text: string | null | undefined): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(renderInline).join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map((li) => `<li>${renderInline(li)}</li>`).join('')}</${list.tag}>`); list = null; };
  const flushQuote = () => { if (quote.length) out.push(`<blockquote><p>${quote.map(renderInline).join('<br>')}</p></blockquote>`); quote = []; };
  const flush = () => { flushPara(); flushList(); flushQuote(); };
  const addItem = (tag: 'ul' | 'ol', item: string) => {
    flushPara(); flushQuote();
    if (list && list.tag !== tag) flushList();
    list ??= { tag, items: [] };
    list.items.push(item);
  };

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      const tag = `h${m[1].length}`;
      out.push(`<${tag}>${renderInline(m[2])}</${tag}>`);
    } else if (/^-{3,}$/.test(line)) {
      flush();
      out.push('<hr>');
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      addItem('ul', m[1]);
    } else if ((m = line.match(/^\d{1,3}[.)]\s+(.*)$/))) {
      addItem('ol', m[1]);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList();
      if (m[1].trim()) quote.push(m[1]);
    } else {
      flushList(); flushQuote();
      para.push(line);
    }
  }
  flush();
  return out.join('\n');
}

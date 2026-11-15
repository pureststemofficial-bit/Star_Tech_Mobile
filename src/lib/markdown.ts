/*
 * Minimal, XSS-safe text formatter for admin-edited pages.
 * Everything is HTML-escaped first; only this tiny syntax is turned into markup:
 *   ## Heading      ### Subheading      - list item      **bold**      [text](/page)      blank line = new paragraph
 * Links must be a site path (/repairs), an http(s) URL, or mailto:/tel:; anything else stays as plain text.
 */

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

const SAFE_HREF = /^(?:\/(?!\/)|https?:\/\/|mailto:|tel:)/i;

// Runs on escaped text, so the link text and URL can no longer contain markup or break out of the attribute.
const link = (whole: string, text: string, href: string) => {
  if (!SAFE_HREF.test(href)) return whole;
  const external = /^https?:/i.test(href);
  return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
};

const inline = (s: string) => escapeHtml(s)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, link)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export function render(text: string | null | undefined): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = []; };

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara(); flushList();
      const tag = m[1].length === 2 ? 'h2' : 'h3';
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara();
      list.push(m[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return out.join('\n');
}

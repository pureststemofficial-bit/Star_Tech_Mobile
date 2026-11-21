'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Code2, Eraser, Heading1, Heading2, Heading3, Heading4, Italic, Link2, List, ListOrdered, Minus, Pilcrow,
  Quote, Redo2, Strikethrough, Underline, Undo2, Unlink,
} from 'lucide-react';
import { render, renderInline, SAFE_HREF } from '@/lib/markdown';
import { cn } from '@/lib/utils';

/*
 * Word-processor style editor for the admin panel. What you see is an editable preview; what is saved is the
 * safe text syntax from lib/markdown.ts, kept in an ordinary <textarea name=…> so the form, the server action
 * and the live SEO score all work exactly as before. "Source" shows and edits that text directly.
 * Pasted content is converted through the same syntax, so no outside HTML or styling can get in.
 */

type Block = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote';
type Mark = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';

/* ---------- HTML -> text syntax ---------- */

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'FIGURE', 'DL', 'DT', 'DD']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'HEAD', 'TITLE', 'META', 'LINK']);

const isBlock = (n: Node) => n.nodeType === 1 && BLOCK_TAGS.has((n as Element).tagName);
const hasBlockChild = (el: Element): boolean => Array.from(el.childNodes).some((c) => isBlock(c) || (c.nodeType === 1 && hasBlockChild(c as Element)));

/** Puts markers around text, keeping surrounding spaces outside them ("** bold**" would not parse). */
function wrap(s: string, marker: string, close = marker) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return m[2] ? `${m[1]}${marker}${m[2]}${close}${m[3]}` : s;
}

function inlineMd(node: Node, active: Set<string> = new Set()): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/[\s ]+/g, ' ');
  if (node.nodeType !== 1) return '';
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (SKIP_TAGS.has(tag)) return '';
  if (tag === 'BR') return '\n';

  const style = el.style;
  const want: string[] = [];
  const weight = style?.fontWeight;
  if (tag === 'B' || tag === 'STRONG' || weight === 'bold' || Number(weight) >= 600) want.push('**');
  if (tag === 'I' || tag === 'EM' || style?.fontStyle === 'italic') want.push('*');
  const deco = `${style?.textDecoration ?? ''} ${style?.textDecorationLine ?? ''}`;
  if (tag === 'U' || tag === 'INS' || deco.includes('underline')) want.push('++');
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || deco.includes('line-through')) want.push('~~');
  // Google Docs wraps whole pastes in <b style="font-weight:normal">.
  if (tag === 'B' && (weight === 'normal' || weight === '400')) want.shift();

  const marks = want.filter((w) => !active.has(w));
  const inner = new Set([...active, ...marks]);
  const s = Array.from(el.childNodes).map((c) => inlineMd(c, inner)).join('');

  if (tag === 'A' && !active.has('a')) {
    const href = (el.getAttribute('href') ?? '').trim();
    const text = s.replace(/\s+/g, ' ');
    // Formatting goes inside the link text: [**bold link**](/page).
    if (SAFE_HREF.test(href) && text.trim()) return wrap(marks.reduceRight((t, m) => wrap(t, m), text), '[', `](${href})`);
  }
  return s.split('\n').map((line) => marks.reduceRight((t, m) => wrap(t, m), line)).join('\n');
}

/** Tidies one paragraph's worth of inline text into lines without stray spaces. */
const lines = (s: string) => s.split('\n').map((l) => l.replace(/ {2,}/g, ' ').trim()).filter(Boolean);

function blocksMd(parent: Node, out: string[]) {
  let run: Node[] = [];
  const flushRun = () => {
    if (!run.length) return;
    const text = lines(run.map((n) => inlineMd(n)).join('')).join('\n');
    if (text) out.push(text);
    run = [];
  };
  for (const node of Array.from(parent.childNodes)) {
    if (!isBlock(node)) {
      if (node.nodeType === 1 && SKIP_TAGS.has((node as Element).tagName)) continue;
      run.push(node);
      continue;
    }
    flushRun();
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'HR') { out.push('---'); continue; }
    if (/^H[1-6]$/.test(tag)) {
      const level = Math.min(Number(tag[1]), 4); // H5 and H6 become H4
      const text = lines(inlineMd(el)).join(' ').replace(/^\*\*([\s\S]*)\*\*$/, '$1');
      if (text) out.push(`${'#'.repeat(level)} ${text}`);
      continue;
    }
    if (tag === 'UL' || tag === 'OL') {
      const items: string[] = [];
      listItems(el, tag === 'OL', items);
      if (items.length) out.push(items.join('\n'));
      continue;
    }
    if (tag === 'BLOCKQUOTE') {
      const inner: string[] = [];
      blocksMd(el, inner);
      const text = inner.join('\n').split('\n').map((l) => l.replace(/^(#{1,4}|[-*]|\d{1,3}[.)]|>)\s+/, '')).filter(Boolean);
      if (text.length) out.push(text.map((l) => `> ${l}`).join('\n'));
      continue;
    }
    if (hasBlockChild(el)) { blocksMd(el, out); continue; }
    const text = lines(inlineMd(el)).join('\n');
    if (text) out.push(text);
  }
  flushRun();
}

/** Flattens a (possibly nested) list into "- item" / "1. item" lines. */
function listItems(list: Element, ordered: boolean, items: string[]) {
  let n = 0;
  for (const li of Array.from(list.children)) {
    if (li.tagName === 'UL' || li.tagName === 'OL') { listItems(li, li.tagName === 'OL', items); continue; }
    const nested: Element[] = [];
    const text = Array.from(li.childNodes).map((c) => {
      if (c.nodeType === 1 && ((c as Element).tagName === 'UL' || (c as Element).tagName === 'OL')) { nested.push(c as Element); return ' '; }
      return inlineMd(c);
    }).join('');
    const t = lines(text).join(' ');
    if (t) items.push(`${ordered ? `${++n}.` : '-'} ${t}`);
    for (const l of nested) listItems(l, l.tagName === 'OL', items);
  }
}

export function htmlToMarkdown(root: Node): string {
  const out: string[] = [];
  blocksMd(root, out);
  return out.join('\n\n');
}

/* ---------- editor ---------- */

const BLOCK_LABELS: { value: Block; label: string }[] = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'blockquote', label: 'Quote' },
];

export function RichTextEditor({
  id,
  name,
  defaultValue,
  maxLength,
  rows = 12,
  placeholder,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  maxLength?: number;
  /** Rough height of the editing area, in lines. */
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const saved = useRef<Range | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [empty, setEmpty] = useState(!defaultValue?.trim());
  const [block, setBlock] = useState<Block>('p');
  const [on, setOn] = useState<Partial<Record<Mark | 'link', boolean>>>({});
  const [linking, setLinking] = useState(false);
  const [length, setLength] = useState(defaultValue?.length ?? 0);

  /** Copies the editor content into the textarea and tells the form (and the SEO score) it changed. */
  const sync = useCallback(() => {
    const el = editor.current, ta = source.current;
    if (!el || !ta) return;
    const md = htmlToMarkdown(el);
    setEmpty(!md && !el.querySelector('li,hr'));
    setLength(md.length);
    if (ta.value === md) return;
    ta.value = md;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  const load = useCallback((md: string) => {
    if (!editor.current) return;
    editor.current.innerHTML = render(md);
    setEmpty(!md.trim());
    setLength(md.length);
  }, []);

  useEffect(() => { load(source.current?.value ?? ''); }, [load]);

  // Remember where the cursor was, so toolbar buttons, the link box and SEO link suggestions act there.
  const refresh = useCallback(() => {
    const el = editor.current;
    const sel = document.getSelection();
    if (!el || !sel?.rangeCount || !el.contains(sel.anchorNode)) return;
    saved.current = sel.getRangeAt(0).cloneRange();
    let n: Node | null = sel.anchorNode;
    let b: Block = 'p';
    let link = false;
    let u = false;
    for (; n && n !== el; n = n.parentNode) {
      const t = (n as Element).tagName?.toLowerCase();
      if (t === 'a') link = true;
      if (t === 'u') u = true;
      if (t === 'h1' || t === 'h2' || t === 'h3' || t === 'h4' || t === 'blockquote') { b = t; break; }
      if (t === 'h5' || t === 'h6') { b = 'h4'; break; }
    }
    setBlock(b);
    const q = (c: Mark) => { try { return document.queryCommandState(c); } catch { return false; } };
    setOn({ bold: q('bold'), italic: q('italic'), underline: link ? u : q('underline'), // links are underlined by CSS, not by markup strikeThrough: q('strikeThrough'),
      insertUnorderedList: q('insertUnorderedList'), insertOrderedList: q('insertOrderedList'), link });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh]);

  const restore = () => {
    const el = editor.current;
    if (!el) return;
    el.focus();
    const sel = document.getSelection();
    if (!sel) return;
    if (saved.current && el.contains(saved.current.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(saved.current);
    } else if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  const exec = (command: string, value?: string) => {
    restore();
    try { document.execCommand('styleWithCSS', false, 'false'); } catch { /* older browsers */ }
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand(command, false, value);
    sync();
    refresh();
  };

  const setBlockType = (b: Block) => exec('formatBlock', `<${b === block && b !== 'p' ? 'p' : b}>`);

  // SEO panel link suggestions insert at the cursor through this event (see seo-panel.tsx).
  useEffect(() => {
    const ta = source.current;
    if (!ta) return;
    const onInsert = (e: Event) => {
      if (mode !== 'visual') return;
      e.preventDefault();
      restore();
      document.execCommand('insertHTML', false, ` ${renderInline((e as CustomEvent<string>).detail)}`);
      sync();
    };
    ta.addEventListener('rte-insert', onInsert);
    return () => ta.removeEventListener('rte-insert', onInsert);
  });

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    let md = text;
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      md = htmlToMarkdown(doc.body);
    }
    if (!md.trim()) return;
    // A single line goes in as inline text; anything longer keeps its paragraphs, headings and lists.
    const out = md.includes('\n') ? render(md) : renderInline(md);
    document.execCommand('insertHTML', false, out);
    sync();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openLink(); }
    if (mod && e.altKey && ['0', '1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      setBlockType(e.key === '0' ? 'p' : (`h${e.key}` as Block));
    }
  };

  const openLink = () => {
    refresh();
    setLinking(true);
    requestAnimationFrame(() => {
      const a = (saved.current?.startContainer.parentElement)?.closest('a');
      if (linkInput.current) { linkInput.current.value = a?.getAttribute('href') ?? ''; linkInput.current.focus(); }
    });
  };

  const applyLink = () => {
    let href = linkInput.current?.value.trim() ?? '';
    setLinking(false);
    if (!href) return;
    if (/^www\./i.test(href)) href = `https://${href}`;
    else if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(href)) href = `https://${href}`;
    else if (!SAFE_HREF.test(href) && /^[\w-]/.test(href)) href = `/${href}`;
    if (!SAFE_HREF.test(href)) return;
    restore();
    const sel = document.getSelection();
    if (sel?.isCollapsed) {
      const a = sel.anchorNode?.parentElement?.closest('a');
      if (a && editor.current?.contains(a)) { a.setAttribute('href', href); sync(); return; }
      document.execCommand('insertHTML', false, renderInline(`[${href.replace(/^https?:\/\//, '')}](${href})`));
      sync();
    } else exec('createLink', href);
  };

  const toggleMode = () => {
    if (mode === 'visual') {
      sync();
      setMode('source');
      requestAnimationFrame(() => source.current?.focus());
    } else {
      load(source.current?.value ?? '');
      setMode('visual');
      requestAnimationFrame(() => editor.current?.focus());
    }
  };

  const visual = mode === 'visual';
  const btn = (label: string, icon: React.ReactNode, action: () => void, active?: boolean, shortcut?: string) => (
    <button type="button" title={shortcut ? `${label} (${shortcut})` : label} aria-label={label} aria-pressed={active}
      disabled={!visual} onMouseDown={(e) => e.preventDefault()} onClick={action}
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}>
      {icon}
    </button>
  );
  const sep = <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;

  return (
    <div className={cn('overflow-hidden rounded-[0.7rem] border border-input bg-card shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30', className)}>
      <div role="toolbar" aria-label="Formatting" aria-controls={id} className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
        <select aria-label="Text style" value={block} disabled={!visual} onChange={(e) => setBlockType(e.target.value as Block)}
          onMouseDown={() => refresh()}
          className="h-8 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40">
          {BLOCK_LABELS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        {sep}
        {btn('Paragraph', <Pilcrow />, () => setBlockType('p'), visual && block === 'p', 'Ctrl+Alt+0')}
        {btn('Heading 1', <Heading1 />, () => setBlockType('h1'), block === 'h1', 'Ctrl+Alt+1')}
        {btn('Heading 2', <Heading2 />, () => setBlockType('h2'), block === 'h2', 'Ctrl+Alt+2')}
        {btn('Heading 3', <Heading3 />, () => setBlockType('h3'), block === 'h3', 'Ctrl+Alt+3')}
        {btn('Heading 4', <Heading4 />, () => setBlockType('h4'), block === 'h4', 'Ctrl+Alt+4')}
        {sep}
        {btn('Bold', <Bold />, () => exec('bold'), on.bold, 'Ctrl+B')}
        {btn('Italic', <Italic />, () => exec('italic'), on.italic, 'Ctrl+I')}
        {btn('Underline', <Underline />, () => exec('underline'), on.underline, 'Ctrl+U')}
        {btn('Strikethrough', <Strikethrough />, () => exec('strikeThrough'), on.strikeThrough)}
        {sep}
        {btn('Bullet list', <List />, () => exec('insertUnorderedList'), on.insertUnorderedList)}
        {btn('Numbered list', <ListOrdered />, () => exec('insertOrderedList'), on.insertOrderedList)}
        {btn('Quote', <Quote />, () => setBlockType('blockquote'), block === 'blockquote')}
        {btn('Divider line', <Minus />, () => exec('insertHorizontalRule'))}
        {sep}
        {btn(on.link ? 'Edit link' : 'Add link', <Link2 />, openLink, on.link, 'Ctrl+K')}
        {btn('Remove link', <Unlink />, () => exec('unlink'))}
        {btn('Clear formatting', <Eraser />, () => { exec('removeFormat'); exec('formatBlock', '<p>'); })}
        {sep}
        {btn('Undo', <Undo2 />, () => exec('undo'), false, 'Ctrl+Z')}
        {btn('Redo', <Redo2 />, () => exec('redo'), false, 'Ctrl+Y')}
        <button type="button" onClick={toggleMode} aria-pressed={!visual} title="Edit the underlying text syntax"
          className={cn('ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4',
            !visual && 'bg-primary/10 text-primary')}>
          <Code2 /> {visual ? 'Source' : 'Visual'}
        </button>
      </div>

      {linking ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
          <label htmlFor={`${id}-link`} className="text-xs font-medium">Link to</label>
          <input id={`${id}-link`} ref={linkInput} type="text" placeholder="/repairs or https://example.com"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setLinking(false); editor.current?.focus(); } }}
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          <button type="button" onClick={applyLink} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Apply</button>
          <button type="button" onClick={() => setLinking(false)} className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      ) : null}

      <div className="relative">
        <div
          ref={editor}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder ?? 'Text editor'}
          contentEditable={visual}
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onKeyUp={refresh}
          onMouseUp={refresh}
          style={{ minHeight: `${rows * 1.75}rem` }}
          className={cn('prose-content max-h-[70vh] overflow-y-auto px-4 py-3 text-[15px] outline-none', !visual && 'hidden')}
        />
        {visual && empty && placeholder ? (
          <p aria-hidden className="pointer-events-none absolute top-3 left-4 text-[15px] text-muted-foreground">{placeholder}</p>
        ) : null}
        <textarea
          ref={source}
          name={name}
          defaultValue={defaultValue ?? ''}
          maxLength={maxLength}
          aria-label="Text syntax"
          onInput={(e) => setLength(e.currentTarget.value.length)}
          style={{ minHeight: `${rows * 1.75}rem` }}
          className={cn('block field-sizing-content max-h-[70vh] w-full resize-y bg-transparent px-4 py-3 font-mono text-sm outline-none', visual && 'hidden')}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{visual ? 'Paste from Word or Google Docs keeps headings, lists, bold and links.' : '# / ## heading · **bold** · *italic* · ++underline++ · ~~strike~~ · - list · 1. list · > quote · ---'}</span>
        {maxLength ? <span className={cn('tabular-nums', length > maxLength && 'text-destructive')}>{length.toLocaleString()} / {maxLength.toLocaleString()}</span> : null}
      </div>
    </div>
  );
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, CircleAlert, CircleCheck, CircleX, CornerDownLeft, Link2, Monitor, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { cn } from '@/lib/utils';
import {
  analyzeSeo, draftFor, linkSuggestions, SEO_GROUPS, SEO_LIMITS,
  type SeoFields, type SeoGroup, type SeoLang, type SeoReport, type SeoSetup, type SeoStatus,
} from '@/lib/seo';
import { analyzeProductSeo, productDraftFor, type ProductSeoFields } from '@/lib/product-seo';

/*
 * Live SEO for the blog and product editors. The form fields stay ordinary uncontrolled inputs;
 * SeoProvider listens to the form's input events and re-scores both languages as the admin types.
 */

export type SeoKind = 'article' | 'product';

const SEO_INPUTS = ['focus_keyword', 'related_keywords', 'seo_title', 'seo_description', 'image_alt'] as const;
const withPt = (names: readonly string[]) => names.flatMap((n) => [n, `${n}_pt`]);

const KINDS = {
  article: {
    fields: [...withPt(['title', 'excerpt', 'body', ...SEO_INPUTS]), 'slug'],
    title: 'title', summary: 'excerpt', body: 'body', path: 'blog', noun: 'article', imageInput: 'image',
    keywordHint: 'The main phrase people type into Google to find this article, e.g. “cracked phone screen”.',
    relatedHint: 'Synonyms and other ways people search for this, separated by commas, e.g. “broken screen, screen repair”.',
    summaryName: 'the summary', altLabel: 'Cover image alt text', noPt: 'Write the Portuguese article text to get a Portuguese SEO score.',
  },
  product: {
    fields: [...withPt(['name', 'short_desc', 'description', 'features', 'specs', ...SEO_INPUTS]), 'brand', 'slug', 'category_id', 'price', 'stock'],
    title: 'name', summary: 'short_desc', body: 'description', path: 'product', noun: 'product', imageInput: 'images',
    keywordHint: 'What shoppers type into Google to find this product, e.g. “iPhone 15 Pro 256GB” or “USB-C fast charger”.',
    relatedHint: 'Other names, model numbers or uses, separated by commas, e.g. “Apple iPhone 15 Pro, A3102, titanium iPhone”.',
    summaryName: 'the short description', altLabel: 'Main photo alt text', noPt: 'Add a Portuguese name or description to get a Portuguese SEO score.',
  },
} as const;

type Values = Record<string, string>;

interface SeoState {
  kind: SeoKind;
  lang: SeoLang;
  setLang: (l: SeoLang) => void;
  values: Values;
  reports: Record<SeoLang, SeoReport | null>;
  setup: SeoSetup;
  image?: string;
  publishedDate: string;
  insert: (text: string) => void;
  dirty: boolean;
}

const Ctx = createContext<SeoState | null>(null);
const useSeo = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('SEO components must be inside <SeoProvider>.');
  return ctx;
};

const LANG_LABEL: Record<SeoLang, string> = { en: 'English', pt: 'Portuguese' };
const STATUS_TEXT: Record<SeoStatus, string> = { good: 'text-success', ok: 'text-warning', bad: 'text-destructive' };
const STATUS_BG: Record<SeoStatus, string> = { good: 'bg-success', ok: 'bg-warning', bad: 'bg-destructive' };
const STATUS_SOFT: Record<SeoStatus, string> = { good: 'bg-success-soft text-success', ok: 'bg-warning-soft text-warning', bad: 'bg-destructive/10 text-destructive' };
const STATUS_WORD: Record<SeoStatus, string> = { good: 'Good', ok: 'Needs work', bad: 'Poor' };

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function SeoProvider({ kind, item, setup, image: initialImage, imageCount: initialImages = 0, children }: {
  kind: SeoKind;
  /** The saved article or product, or undefined for a new one. */
  item?: object;
  setup: SeoSetup;
  /** The current cover or main photo, for the social preview. */
  image?: string;
  /** Products: photos already saved. */
  imageCount?: number;
  children: React.ReactNode;
}) {
  const cfg = KINDS[kind];
  const ref = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<SeoLang>('en');
  const [values, setValues] = useState<Values>(() => Object.fromEntries(cfg.fields.map((k) => [k, str((item as Record<string, unknown> | undefined)?.[k])])));
  const [imageCount, setImageCount] = useState(initialImages);
  const [image, setImage] = useState<string | undefined>(initialImage);
  const [publishedDate, setPublishedDate] = useState(() => str((item as { published?: string } | undefined)?.published) || new Date().toISOString().slice(0, 10));
  const [dirty, setDirty] = useState(false);

  const form = useCallback(() => ref.current?.closest('form') ?? null, []);

  useEffect(() => {
    const f = form();
    if (!f) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const next: Values = {};
      for (const k of cfg.fields) next[k] = (f.elements.namedItem(k) as HTMLInputElement | null)?.value ?? '';
      setValues(next);
      const date = f.elements.namedItem('published') as HTMLInputElement | null;
      if (date?.value) setPublishedDate(date.value);
      if (kind === 'product') {
        const saved = f.querySelectorAll('input[name="main_image"]').length - f.querySelectorAll('input[name="remove_image"]:checked').length;
        const uploads = (f.elements.namedItem(cfg.imageInput) as HTMLInputElement | null)?.files?.length ?? 0;
        setImageCount(saved + Math.min(uploads, 10));
      }
    };
    const onInput = (e: Event) => {
      setDirty(true);
      clearTimeout(timer);
      timer = setTimeout(read, 150);
      const t = e.target as HTMLInputElement;
      if (t.name === cfg.imageInput && t.files?.[0]) setImage(URL.createObjectURL(t.files[0]));
    };
    read();
    f.addEventListener('input', onInput);
    f.addEventListener('change', onInput);
    return () => { clearTimeout(timer); f.removeEventListener('input', onInput); f.removeEventListener('change', onInput); };
  }, [form, cfg, kind]);

  // Warn before leaving with unsaved changes: closing the tab, reloading, or following a link in the admin panel.
  // Saving navigates programmatically, so it is never blocked.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (!window.confirm(`You have unsaved changes to this ${cfg.noun}. Leave without saving?`)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true); };
  }, [dirty, cfg]);

  // Revoke the object URL of a replaced local preview.
  useEffect(() => () => { if (image?.startsWith('blob:')) URL.revokeObjectURL(image); }, [image]);

  const reports = useMemo(() => {
    const out = {} as Record<SeoLang, SeoReport | null>;
    for (const l of ['en', 'pt'] as const) {
      const ctx = { lang: l, slug: values.slug, siteName: setup.siteName[l], peers: setup.peers[l], checkSlug: l === 'en' };
      if (kind === 'article') {
        const draft = draftFor(values as SeoFields, l);
        out[l] = draft ? analyzeSeo(draft, ctx) : null;
      } else {
        const category = setup.categories?.[values.category_id] ?? { en: '', pt: '' };
        const draft = productDraftFor(values as ProductSeoFields, l, { category, images: imageCount });
        out[l] = draft ? analyzeProductSeo(draft, ctx) : null;
      }
    }
    return out;
  }, [values, setup, kind, imageCount]);

  /** Inserts text at the cursor in the article body of the current language. */
  const insert = useCallback((text: string) => {
    const body = form()?.elements.namedItem(lang === 'en' ? cfg.body : `${cfg.body}_pt`) as HTMLTextAreaElement | null;
    if (!body) return;
    // The rich-text editor inserts at its own cursor; it cancels this event when it handles it.
    if (!body.dispatchEvent(new CustomEvent('rte-insert', { detail: text, cancelable: true }))) {
      toast.success('Link added to the article text.');
      return;
    }
    const start = body.selectionStart ?? body.value.length;
    const end = body.selectionEnd ?? start;
    const before = body.value.slice(0, start);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    body.setRangeText(pad + text, start, end, 'end');
    body.dispatchEvent(new Event('input', { bubbles: true }));
    body.focus();
    toast.success('Link added to the article text.');
  }, [form, lang, cfg]);

  const state = useMemo(() => ({ kind, lang, setLang, values, reports, setup, image, publishedDate, insert, dirty }),
    [kind, lang, values, reports, setup, image, publishedDate, insert, dirty]);
  return <Ctx.Provider value={state}><div ref={ref} className="contents">{children}</div></Ctx.Provider>;
}

/* ---------- small pieces ---------- */

function LangSwitch() {
  const { lang, setLang, reports } = useSeo();
  return (
    <div role="tablist" aria-label="Language to analyse" className="inline-flex rounded-full border bg-muted/50 p-0.5">
      {(['en', 'pt'] as const).map((l) => {
        const r = reports[l];
        return (
          <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors', lang === l ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
            {LANG_LABEL[l]}
            <span className={cn('rounded-full px-1.5 text-[10px] font-semibold tabular-nums', r ? STATUS_SOFT[r.status] : 'bg-muted text-muted-foreground')}>{r ? r.score : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}

function Meter({ length, min, max, label }: { length: number; min: number; max: number; label: string }) {
  const status: SeoStatus = length >= min && length <= max ? 'good' : length === 0 || length > max + 10 || length < min / 2 ? 'bad' : 'ok';
  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', STATUS_BG[status])} style={{ width: `${Math.min(100, (length / (max + 10)) * 100)}%` }} />
      </div>
      <p className={cn('text-xs tabular-nums', status === 'good' ? 'text-muted-foreground' : STATUS_TEXT[status])}>
        {length} / {max} characters {label}{status === 'good' ? ' · good length' : length > max ? ' · too long, Google will cut it off' : ' · a little short'}
      </p>
    </div>
  );
}

function ScoreRing({ score, status, size = 112 }: { score: number; status: SeoStatus; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`SEO score ${score} out of 100`}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke="currentColor"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 50 50)"
        className={cn('transition-[stroke-dashoffset] duration-500', STATUS_TEXT[status])} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[26px] font-semibold tabular-nums">{score}</text>
    </svg>
  );
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Saved scores over time as a small line chart, with the live score as the last point. */
function History({ points, current }: { points: { day: string; score: number }[]; current: number }) {
  const all = [...points.map((p) => p.score), current];
  const w = 260;
  const h = 48;
  const x = (i: number) => (i * w) / (all.length - 1);
  const y = (v: number) => h - 4 - (v / 100) * (h - 8);
  const line = all.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <div className="grid gap-1">
      <h3 className="text-xs font-semibold">Score history</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full overflow-visible" role="img"
        aria-label={`Saved scores from ${points[0].score} on ${fmt(points[0].day)} to ${current} now`}>
        <line x1="0" x2={w} y1={y(80)} y2={y(80)} className="stroke-success/40" strokeDasharray="3 3" />
        <path d={line} fill="none" strokeWidth="2" className="stroke-primary" strokeLinejoin="round" />
        {all.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === all.length - 1 ? 3.5 : 2} className={i === all.length - 1 ? 'fill-primary' : 'fill-card stroke-primary'} strokeWidth="1.5" />)}
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>{fmt(points[0].day)}: {points[0].score}</span><span>Dashed line: 80 (good)</span><span>Now: {current}</span></div>
    </div>
  );
}

/* ---------- main-column card: SEO fields and previews ---------- */

export function SeoFieldsCard({ item }: { item?: object }) {
  const { kind, lang, values, reports, setup, image, publishedDate } = useSeo();
  const cfg = KINDS[kind];
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const report = reports[lang];
  const local = (base: string, l: SeoLang = lang) => (l === 'pt' && values[`${base}_pt`]?.trim() ? values[`${base}_pt`] : values[base]) ?? '';
  const slug = values.slug || `your-${cfg.noun}`;
  const title = report?.stats.displayTitle ?? '';
  const description = report?.stats.displayDescription ?? '';
  const locale = lang === 'pt' ? 'pt-PT' : 'en-GB';

  // Articles show their date in Google; products can show price and stock (from the Product structured data).
  let snippet = '';
  if (kind === 'article') {
    snippet = new Date(`${publishedDate}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } else {
    const price = Number(String(values.price).replace(',', '.'));
    const parts: string[] = [];
    if (values.price && Number.isFinite(price)) parts.push(new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(price));
    if (values.stock !== '') parts.push(Number(values.stock) > 0 ? (lang === 'pt' ? 'Em stock' : 'In stock') : (lang === 'pt' ? 'Esgotado' : 'Out of stock'));
    snippet = parts.join(' · ');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Search engine optimisation</CardTitle>
        <LangSwitch />
      </CardHeader>
      <CardContent className="grid gap-5">
        {/* Both languages stay mounted so every field is submitted; only the chosen one is shown. */}
        {(['en', 'pt'] as const).map((l) => {
          const s = l === 'pt' ? '_pt' : '';
          const saved = (base: string) => str((item as Record<string, unknown> | undefined)?.[`${base}${s}`]) || undefined;
          return (
            <div key={l} hidden={lang !== l} className="grid gap-4">
              {l === 'pt' && !reports.pt ? <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">{cfg.noPt}</p> : null}
              <Field label="Focus keyword" htmlFor={`focus_keyword${s}`} hint={cfg.keywordHint}>
                <Input id={`focus_keyword${s}`} name={`focus_keyword${s}`} defaultValue={saved('focus_keyword')} maxLength={80} autoComplete="off" />
              </Field>
              <Field label="Related keyphrases" htmlFor={`related_keywords${s}`} optional hint={cfg.relatedHint}>
                <Input id={`related_keywords${s}`} name={`related_keywords${s}`} defaultValue={saved('related_keywords')} maxLength={300} autoComplete="off" />
              </Field>
              <Field label="SEO title" htmlFor={`seo_title${s}`} optional hint={`Shown as the blue link in Google. Leave blank to use the ${kind === 'article' ? 'article title' : 'product name'} followed by the shop name.`}>
                <Input id={`seo_title${s}`} name={`seo_title${s}`} defaultValue={saved('seo_title')} maxLength={120}
                  placeholder={[local(cfg.title, l), setup.siteName[l]].filter(Boolean).join(' | ')} />
                <Meter length={reports[l]?.stats.displayTitle.length ?? 0} min={SEO_LIMITS.title.min} max={SEO_LIMITS.title.max} label="shown in Google" />
              </Field>
              <Field label="Meta description" htmlFor={`seo_description${s}`} optional hint={`The grey text under the link in Google. Leave blank to use ${cfg.summaryName}.`}>
                <Textarea id={`seo_description${s}`} name={`seo_description${s}`} defaultValue={saved('seo_description')} rows={3} maxLength={320}
                  placeholder={local(cfg.summary, l)} />
                <Meter length={reports[l]?.stats.displayDescription.length ?? 0} min={SEO_LIMITS.description.min} max={SEO_LIMITS.description.max} label="shown in Google" />
              </Field>
              <Field label={cfg.altLabel} htmlFor={`image_alt${s}`} hint={l === 'pt' ? 'Leave blank to use the English alt text.' : 'Describes the photo for search engines and screen readers.'}>
                <Input id={`image_alt${s}`} name={`image_alt${s}`} defaultValue={saved('image_alt')} maxLength={160} />
              </Field>
            </div>
          );
        })}

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Google preview</h3>
            <div className="inline-flex rounded-full border bg-muted/50 p-0.5">
              {([['desktop', Monitor], ['mobile', Smartphone]] as const).map(([d, Icon]) => (
                <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={`${d} preview`}
                  className={cn('rounded-full px-2.5 py-1', device === d ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground')}>
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>
          <div className={cn('rounded-xl border bg-white p-4 font-[arial,sans-serif] text-left', device === 'mobile' ? 'max-w-[380px]' : 'max-w-[620px]')}>
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f1f3f4] text-[11px] font-bold text-[#202124]">{(setup.siteName[lang] || 'S').slice(0, 1)}</span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[14px] text-[#202124]">{setup.siteName[lang]}</div>
                <div className="truncate text-[12px] text-[#4d5156]">https://{setup.host} › {cfg.path} › {slug}</div>
              </div>
            </div>
            <div className={cn('mt-2 leading-snug text-[#1a0dab]', device === 'mobile' ? 'text-[18px]' : 'text-[20px]')}>{truncate(title || (kind === 'article' ? 'Article title' : 'Product name'), device === 'mobile' ? 70 : 60)}</div>
            <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
              {kind === 'article' && snippet ? <span className="text-[#70757a]">{snippet} — </span> : null}
              {truncate(description || `Write ${cfg.summaryName} or a meta description to control the text shown here.`, device === 'mobile' ? 120 : 160)}
            </p>
            {kind === 'product' && snippet ? <p className="mt-1 text-[13px] text-[#4d5156]">{snippet}</p> : null}
          </div>
        </div>

        <div className="grid gap-3">
          <h3 className="text-sm font-semibold">Social share preview</h3>
          <div className="max-w-[520px] overflow-hidden rounded-xl border bg-card">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className={cn('aspect-[1.91/1] w-full bg-muted', kind === 'product' ? 'object-contain bg-white' : 'object-cover')} />
            ) : <div className="grid aspect-[1.91/1] place-items-center bg-muted text-sm text-muted-foreground">{kind === 'article' ? 'Upload a cover image' : 'Upload a product photo'}</div>}
            <div className="border-t bg-muted/40 px-4 py-3">
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{setup.host}</div>
              <div className="mt-0.5 line-clamp-1 font-semibold">{(lang === 'pt' ? values.seo_title_pt : values.seo_title)?.trim() || local(cfg.title) || (kind === 'article' ? 'Article title' : 'Product name')}</div>
              <div className="line-clamp-2 text-sm text-muted-foreground">{description || local(cfg.summary)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- sidebar card: score, checklist, link suggestions ---------- */

const ORDER: SeoStatus[] = ['bad', 'ok', 'good'];
const ICON = { good: CircleCheck, ok: CircleAlert, bad: CircleX } as const;

export function SeoScoreCard() {
  const { kind, lang, reports, values, setup, insert, dirty } = useSeo();
  const report = reports[lang];
  const history = setup.history[lang];
  const lastSaved = history.at(-1)?.score;
  const wins = useMemo(() => (report ? report.checks.filter((c) => c.gain >= 0.5).sort((a, b) => b.gain - a.gain).slice(0, 3) : []), [report]);
  const body = lang === 'en' ? values.body : values.body_pt;
  const suggestions = useMemo(() => (kind === 'article' ? linkSuggestions(body ?? '', setup.peers[lang]) : []), [kind, body, setup.peers, lang]);

  const groups = useMemo(() => {
    if (!report) return [];
    return (Object.keys(SEO_GROUPS) as SeoGroup[]).map((g) => {
      const checks = report.checks.filter((c) => c.group === g).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
      return { g, checks, problems: checks.filter((c) => c.status !== 'good').length };
    }).filter((x) => x.checks.length);
  }, [report]);

  const tiles: [string, string | number][] = !report ? [] : kind === 'article' ? [
    ['Words', report.stats.words],
    ['Read time', `${report.stats.readingMinutes} min`],
    ['Keyword', `${report.stats.keywordCount}×`],
    ['Density', `${report.stats.density.toFixed(1)}%`],
    ['Readability', Math.round(report.stats.readingEase)],
    ['Links', report.stats.internalLinks + report.stats.externalLinks],
  ] : [
    ['Words', report.stats.words],
    ['Keyword', `${report.stats.keywordCount}×`],
    ['Density', `${report.stats.density.toFixed(1)}%`],
    ['Photos', report.stats.images ?? 0],
    ['Features', report.stats.features ?? 0],
    ['Specs', report.stats.specs ?? 0],
  ];

  return (
    <Card>
      <CardHeader className="grid gap-3">
        <CardTitle className="text-base">SEO score</CardTitle>
        <LangSwitch />
      </CardHeader>
      <CardContent className="grid gap-5">
        {report ? (
          <>
            <div className="flex items-center gap-4">
              <ScoreRing score={report.score} status={report.status} />
              <div className="grid gap-1">
                <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_SOFT[report.status])}>{STATUS_WORD[report.status]}</span>
                <p className="text-xs text-muted-foreground">
                  {report.checks.filter((c) => c.status === 'bad').length} problems · {report.checks.filter((c) => c.status === 'ok').length} improvements · updates as you type
                </p>
                {lastSaved !== undefined && lastSaved !== report.score ? (
                  <p className={cn('text-xs font-medium', report.score > lastSaved ? 'text-success' : 'text-destructive')}>
                    {report.score > lastSaved ? '▲' : '▼'} {Math.abs(report.score - lastSaved)} since last save
                  </p>
                ) : null}
                {dirty ? <p className="text-xs font-medium text-warning">Unsaved changes</p> : null}
              </div>
            </div>

            {wins.length ? (
              <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Biggest wins</h3>
                <ol className="grid gap-2">
                  {wins.map((c) => (
                    <li key={c.id} className="flex gap-2 text-xs leading-relaxed">
                      <span className="h-fit shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground tabular-nums">+{Math.round(c.gain)}</span>
                      <span>{c.message}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {history.length > 1 ? <History points={history} current={report.score} /> : null}

            <dl className="grid grid-cols-3 gap-2 text-center">
              {tiles.map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/60 px-1 py-2">
                  <dd className="text-sm font-semibold tabular-nums">{v}</dd>
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>

            <div className="grid gap-2">
              {groups.map(({ g, checks, problems }) => (
                <details key={g} open={problems > 0} className="group rounded-lg border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {SEO_GROUPS[g]}
                    <span className="flex items-center gap-1.5">
                      {problems ? <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning">{problems}</span> : <CircleCheck className="size-4 text-success" />}
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="grid gap-2 border-t px-3 py-2.5">
                    {checks.map((c) => {
                      const Icon = ICON[c.status];
                      return (
                        <li key={c.id} className="flex gap-2 text-xs leading-relaxed">
                          <Icon className={cn('mt-0.5 size-3.5 shrink-0', STATUS_TEXT[c.status])} aria-label={STATUS_WORD[c.status]} />
                          <span className={c.status === 'good' ? 'text-muted-foreground' : ''}>{c.message}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No Portuguese text yet. Visitors browsing in Portuguese see the English version.</p>
        )}

        {suggestions.length ? (
          <div className="grid gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Link2 className="size-4" /> Internal link ideas</h3>
            <p className="text-xs text-muted-foreground">Related articles not linked yet. Place the cursor in the article text, then add a link.</p>
            <ul className="grid gap-1.5">
              {suggestions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 py-1.5 pr-1.5 pl-3 text-xs">
                  <span className="line-clamp-2">{p.title}</span>
                  <Button type="button" size="sm" variant="white" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => insert(`[${p.title}](/blog/${p.slug})`)}>
                    <CornerDownLeft className="size-3" /> Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

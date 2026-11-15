/*
 * Blog SEO analysis. Pure functions with no server imports, so the same rules score an article
 * live in the editor (client) and on the Admin -> Blog dashboard (server).
 *
 * The body is the small markdown dialect from lib/markdown.ts: ## / ### headings, - lists,
 * **bold**, [text](url) links and blank lines between paragraphs.
 */

export type SeoLang = 'en' | 'pt';
export type SeoStatus = 'good' | 'ok' | 'bad';
export type SeoGroup = 'keyword' | 'meta' | 'content' | 'readability' | 'links';

export const SEO_GROUPS: Record<SeoGroup, string> = {
  keyword: 'Focus keyword',
  meta: 'Search listing',
  content: 'Content',
  links: 'Links',
  readability: 'Readability',
};

export interface SeoCheck {
  id: string;
  group: SeoGroup;
  status: SeoStatus;
  /** What was found, written as advice when the check is not good. */
  message: string;
  weight: number;
  /** Points the overall score would gain if this check became good. */
  gain: number;
}

/** The text being scored, in one language. */
export interface SeoDraft {
  title: string;
  seoTitle: string;
  excerpt: string;
  seoDescription: string;
  body: string;
  keyword: string;
  imageAlt: string;
  /** Comma-separated synonyms and related phrases. */
  related: string;
}

/** Another article, used to spot duplicate keywords and titles and to suggest internal links. */
export interface SeoPeer {
  id: number;
  slug: string;
  title: string;
  keyword: string;
}

/** What the editor's live panel needs besides the article: site names, domain and the other articles. */
export interface SeoSetup {
  siteName: Record<SeoLang, string>;
  host: string;
  peers: Record<SeoLang, SeoPeer[]>;
  /** Scores recorded when the article was saved, oldest first. */
  history: Record<SeoLang, { day: string; score: number }[]>;
}

export interface SeoContext {
  lang: SeoLang;
  slug: string;
  siteName: string;
  /** Other articles in the same language. */
  peers?: SeoPeer[];
  /** Only the English analysis checks the slug, since both languages share one URL. */
  checkSlug?: boolean;
}

export interface SeoStats {
  words: number;
  readingMinutes: number;
  keywordCount: number;
  /** Percent of words that belong to a keyword match. */
  density: number;
  headings: number;
  paragraphs: number;
  internalLinks: number;
  externalLinks: number;
  /** Flesch reading ease (Portuguese uses the Martins adaptation). */
  readingEase: number;
  avgSentenceWords: number;
  /** The title and description as a search engine would show them. */
  displayTitle: string;
  displayDescription: string;
}

export interface SeoReport {
  score: number;
  status: SeoStatus;
  checks: SeoCheck[];
  stats: SeoStats;
}

/* ---------- limits ---------- */

export const SEO_LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 120, max: 160 },
  words: { ok: 300, good: 600 },
  density: { min: 0.5, max: 2.5, stuffing: 3.5 },
  slugMax: 75,
  sectionWords: 300,
  paragraphWords: 150,
} as const;

/** Short names for each check, for the dashboard's list of common issues. */
export const SEO_CHECK_LABELS: Record<string, string> = {
  'kw-set': 'No focus keyword',
  'kw-title': 'Keyword missing from SEO title',
  'kw-desc': 'Keyword missing from meta description',
  'kw-intro': 'Keyword missing from first paragraph',
  'kw-heading': 'Keyword missing from subheadings',
  'kw-density': 'Keyword density off',
  'kw-slug': 'Keyword missing from URL',
  'kw-alt': 'Cover alt text missing',
  'kw-unique': 'Keyword used by another article',
  'meta-title': 'SEO title length',
  'meta-desc': 'Meta description length',
  'meta-unique': 'Duplicate title',
  'meta-slug': 'Long URL',
  'content-length': 'Article too short',
  'content-headings': 'Needs more subheadings',
  'content-lists': 'No bullet lists',
  'links-internal': 'No internal links',
  'links-external': 'No outbound links',
  'read-ease': 'Hard to read',
  'read-sentences': 'Long sentences',
  'read-paragraphs': 'Long paragraphs',
  'kw-related': 'Related keyphrases missing',
  'read-transitions': 'Few transition words',
  'read-passive': 'Too much passive voice',
};

export const scoreStatus = (score: number): SeoStatus => (score >= 80 ? 'good' : score >= 50 ? 'ok' : 'bad');

/* ---------- text helpers ---------- */

/** Lowercase, accents removed, punctuation turned into single spaces. "Ecrã partido!" -> "ecra partido". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Number of times the keyword phrase appears, matched on whole words. */
export function countPhrase(text: string, keyword: string): number {
  const kw = normalize(keyword);
  if (!kw) return 0;
  const hay = ` ${normalize(text)} `;
  let n = 0;
  let i = hay.indexOf(` ${kw} `);
  while (i !== -1) { n++; i = hay.indexOf(` ${kw} `, i + kw.length + 1); }
  return n;
}

const has = (text: string, keyword: string) => countPhrase(text, keyword) > 0;
const words = (s: string) => normalize(s).split(' ').filter(Boolean);

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export interface ParsedBody {
  headings: string[];
  /** Plain-text blocks (paragraphs and list items), in order. */
  paragraphs: string[];
  /** Words in each section, split at every heading. */
  sectionWords: number[];
  links: string[];
  lists: number;
  text: string;
}

export function parseBody(body: string): ParsedBody {
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const sectionWords: number[] = [0];
  const links: string[] = [];
  let lists = 0;
  let para: string[] = [];
  let inList = false;
  const plain = (line: string) => line.replace(LINK, (_m, text: string, url: string) => { links.push(url); return text; }).replace(/\*\*/g, '');
  const flush = () => {
    if (para.length) {
      const p = para.join(' ');
      paragraphs.push(p);
      sectionWords[sectionWords.length - 1] += words(p).length;
    }
    para = [];
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flush(); inList = false; continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#{2,3}\s+(.*)$/))) {
      flush(); inList = false;
      headings.push(plain(m[1]));
      sectionWords.push(0);
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flush();
      if (!inList) lists++;
      inList = true;
      para = [plain(m[1])];
      flush();
    } else {
      inList = false;
      para.push(plain(line));
    }
  }
  flush();
  return { headings, paragraphs, sectionWords, links, lists, text: [...headings, ...paragraphs].join('\n') };
}

/** Rough syllable count from vowel groups. Good enough for a reading-ease estimate. */
function syllables(word: string, lang: SeoLang): number {
  const w = normalize(word);
  if (!w) return 0;
  if (lang === 'en') {
    const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups?.length ?? 1);
  }
  return Math.max(1, w.match(/[aeiou]+/g)?.length ?? 1);
}

function sentencesOf(blocks: string[]): string[] {
  return blocks.flatMap((b) => b.split(/(?<=[.!?…])\s+/)).map((s) => s.trim()).filter((s) => words(s).length > 0);
}

export const splitPhrases = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

/* Matched against normalized text (no accents), padded with spaces. */
const TRANSITIONS: Record<SeoLang, RegExp> = {
  en: / (also|however|because|therefore|so|then|first|second|finally|for example|for instance|in addition|instead|meanwhile|although|but|besides|as a result|in fact|of course|that said|otherwise|similarly|next|after that|before|once|if|while|unless|overall|in short) /,
  pt: / (tambem|no entanto|porque|portanto|entao|primeiro|depois|finalmente|por exemplo|alem disso|em vez|enquanto|embora|mas|contudo|por isso|assim|de facto|ou seja|caso|antes|apos|em resumo|ainda|logo|pois) /,
};

/* A form of "to be" followed by a past participle. Approximate, like every passive-voice detector. */
const PASSIVE: Record<SeoLang, RegExp> = {
  en: /\b(am|is|are|was|were|be|been|being|gets|got)\s+(\w+ly\s+)?(\w+ed|known|made|done|given|taken|seen|written|built|broken|found|kept|left|paid|sold|sent|shown|told|worn|held|brought|bought|caught|put|set|cut|hit)\b/,
  pt: /(?:^|\s)(é|são|foi|foram|era|eram|será|serão|ser|sido|seja|sejam)\s+(\S+(?:ado|ada|ados|adas|ido|ida|idos|idas|ito|ita|itos|itas|osto|osta))(?=[\s.,;!?]|$)/,
};

export const isInternalLink = (url: string) => url.startsWith('/') && !url.startsWith('//');

/* ---------- analysis ---------- */

/** The title search engines show: a custom SEO title is used as written, otherwise "Title | Site". */
export function displayTitle(draft: Pick<SeoDraft, 'title' | 'seoTitle'>, siteName: string): string {
  const custom = draft.seoTitle.trim();
  if (custom) return custom;
  return [draft.title.trim(), siteName].filter(Boolean).join(' | ');
}

export const displayDescription = (draft: Pick<SeoDraft, 'excerpt' | 'seoDescription'>) => (draft.seoDescription.trim() || draft.excerpt.trim());

export function analyzeSeo(draft: SeoDraft, ctx: SeoContext): SeoReport {
  const L = SEO_LIMITS;
  const kw = draft.keyword.trim();
  const kwNorm = normalize(kw);
  const kwWords = kwNorm ? kwNorm.split(' ').length : 0;
  const parsed = parseBody(draft.body);
  const bodyWords = words(parsed.text).length;
  const title = displayTitle(draft, ctx.siteName);
  const description = displayDescription(draft);
  const peers = ctx.peers ?? [];
  const checks: SeoCheck[] = [];
  const add = (id: string, group: SeoGroup, weight: number, status: SeoStatus, message: string) => checks.push({ id, group, weight, status, message, gain: 0 });

  /* Focus keyword */
  const keywordCount = kw ? countPhrase(parsed.text, kw) : 0;
  const density = bodyWords && kwWords ? (keywordCount * kwWords * 100) / bodyWords : 0;
  if (!kw) {
    add('kw-set', 'keyword', 8, 'bad', 'Set a focus keyword: the phrase people would type into Google to find this article.');
  } else {
    if (kwWords > 5) add('kw-set', 'keyword', 8, 'ok', `The focus keyword has ${kwWords} words. Shorter phrases of 2 to 4 words are easier to rank for.`);
    else add('kw-set', 'keyword', 8, 'good', `Focus keyword set: “${kw}”.`);

    const titleText = draft.seoTitle.trim() || draft.title;
    if (normalize(titleText).startsWith(kwNorm)) add('kw-title', 'keyword', 9, 'good', 'The focus keyword starts the SEO title.');
    else if (has(titleText, kw)) add('kw-title', 'keyword', 9, 'ok', 'The focus keyword is in the SEO title. Moving it nearer the start helps.');
    else add('kw-title', 'keyword', 9, 'bad', 'Use the focus keyword in the SEO title.');

    add('kw-desc', 'keyword', 6, has(description, kw) ? 'good' : 'bad',
      has(description, kw) ? 'The focus keyword is in the meta description.' : 'Use the focus keyword in the meta description.');

    const intro = parsed.paragraphs[0] ?? '';
    add('kw-intro', 'keyword', 6, has(intro, kw) ? 'good' : 'bad',
      has(intro, kw) ? 'The focus keyword appears in the first paragraph.' : 'Mention the focus keyword in the first paragraph.');

    const inHeading = parsed.headings.filter((h) => has(h, kw)).length;
    if (!parsed.headings.length) add('kw-heading', 'keyword', 4, 'bad', 'Add subheadings (## Heading) and use the focus keyword in at least one.');
    else if (!inHeading) add('kw-heading', 'keyword', 4, 'bad', 'Use the focus keyword, or a close variation, in at least one subheading.');
    else if (inHeading / parsed.headings.length > 0.75 && parsed.headings.length > 1) add('kw-heading', 'keyword', 4, 'ok', 'The focus keyword is in almost every subheading. Vary them so they read naturally.');
    else add('kw-heading', 'keyword', 4, 'good', `The focus keyword is in ${inHeading} of ${parsed.headings.length} subheadings.`);

    const pct = density.toFixed(1);
    if (!keywordCount) add('kw-density', 'keyword', 7, 'bad', 'The focus keyword never appears in the article text.');
    else if (density > L.density.stuffing) add('kw-density', 'keyword', 7, 'bad', `Keyword density is ${pct}% (${keywordCount}×). That looks like keyword stuffing; aim for ${L.density.min}–${L.density.max}%.`);
    else if (density > L.density.max) add('kw-density', 'keyword', 7, 'ok', `Keyword density is ${pct}% (${keywordCount}×), a little high. Aim for ${L.density.min}–${L.density.max}%.`);
    else if (density < L.density.min) add('kw-density', 'keyword', 7, 'ok', `Keyword density is ${pct}% (${keywordCount}×). Use the keyword a few more times; aim for ${L.density.min}–${L.density.max}%.`);
    else add('kw-density', 'keyword', 7, 'good', `Keyword density is ${pct}% (${keywordCount}×), within ${L.density.min}–${L.density.max}%.`);

    if (ctx.checkSlug) {
      const slugText = ctx.slug.replace(/-/g, ' ');
      add('kw-slug', 'keyword', 4, has(slugText, kw) ? 'good' : 'ok',
        has(slugText, kw) ? 'The focus keyword is in the URL.' : 'Consider putting the focus keyword in the URL slug (only for new articles: changing it breaks old links).');
    }

    add('kw-alt', 'keyword', 3, !draft.imageAlt.trim() ? 'bad' : has(draft.imageAlt, kw) ? 'good' : 'ok',
      !draft.imageAlt.trim() ? 'Describe the cover image in its alt text.' : has(draft.imageAlt, kw) ? 'The cover image alt text includes the focus keyword.' : 'The cover image has alt text. Including the focus keyword, where it fits, helps image search.');

    const clash = peers.find((p) => normalize(p.keyword) === kwNorm);
    add('kw-unique', 'keyword', 5, clash ? 'bad' : 'good',
      clash ? `“${clash.title}” already targets this keyword. Two articles competing for one search split their ranking; pick a different keyword or merge them.` : 'No other article targets this keyword.');

    const related = splitPhrases(draft.related).filter((r) => normalize(r) !== kwNorm);
    if (!related.length) add('kw-related', 'keyword', 3, 'ok', 'Add 2–4 related keyphrases (synonyms or other ways people search for this) and use them in the text.');
    else {
      const missing = related.filter((r) => !has(parsed.text, r));
      add('kw-related', 'keyword', 3, !missing.length ? 'good' : missing.length < related.length ? 'ok' : 'bad',
        !missing.length ? `All ${related.length} related keyphrases appear in the text.` : `Use these related keyphrases in the text: ${missing.map((m) => `“${m}”`).join(', ')}.`);
    }
  }

  /* Search listing */
  const tl = title.length;
  if (tl < L.title.min) add('meta-title', 'meta', 6, tl < 15 ? 'bad' : 'ok', `The SEO title is ${tl} characters. Aim for ${L.title.min}–${L.title.max} to use the space Google gives you.`);
  else if (tl > L.title.max) add('meta-title', 'meta', 6, tl > 70 ? 'bad' : 'ok', `The SEO title is ${tl} characters, so Google will cut it off. Keep it under ${L.title.max}.`);
  else add('meta-title', 'meta', 6, 'good', `The SEO title is ${tl} characters: a good length.`);

  const dl = description.length;
  if (!dl) add('meta-desc', 'meta', 6, 'bad', 'Write a meta description (or a summary) so Google does not pick random text.');
  else if (dl < L.description.min) add('meta-desc', 'meta', 6, dl < 70 ? 'bad' : 'ok', `The meta description is ${dl} characters. Aim for ${L.description.min}–${L.description.max}.`);
  else if (dl > L.description.max) add('meta-desc', 'meta', 6, dl > 200 ? 'bad' : 'ok', `The meta description is ${dl} characters and will be cut off. Keep it under ${L.description.max}.`);
  else add('meta-desc', 'meta', 6, 'good', `The meta description is ${dl} characters: a good length.`);

  const titleClash = peers.find((p) => normalize(p.title) === normalize(draft.title) && draft.title.trim());
  add('meta-unique', 'meta', 4, titleClash ? 'bad' : 'good', titleClash ? 'Another article has the same title. Every page needs a unique title.' : 'The title is unique across the blog.');

  if (ctx.checkSlug) {
    const sl = ctx.slug.length;
    if (!ctx.slug) add('meta-slug', 'meta', 2, 'ok', 'The URL slug will be generated from the title.');
    else add('meta-slug', 'meta', 2, sl > L.slugMax ? 'ok' : 'good', sl > L.slugMax ? `The URL slug is ${sl} characters. Short URLs are easier to share.` : 'The URL slug is short and readable.');
  }

  /* Content */
  if (bodyWords >= L.words.good) add('content-length', 'content', 8, 'good', `${bodyWords} words: enough depth to rank well.`);
  else if (bodyWords >= L.words.ok) add('content-length', 'content', 8, 'ok', `${bodyWords} words. Articles of ${L.words.good}+ words usually rank better; add more detail if it helps the reader.`);
  else add('content-length', 'content', 8, 'bad', `${bodyWords} words. Write at least ${L.words.ok}; Google treats very short articles as thin content.`);

  if (!parsed.headings.length) add('content-headings', 'content', 5, bodyWords > 150 ? 'bad' : 'ok', 'Break the article up with ## subheadings so readers and Google can scan it.');
  else {
    const longest = Math.max(...parsed.sectionWords);
    add('content-headings', 'content', 5, longest > L.sectionWords ? 'ok' : 'good',
      longest > L.sectionWords ? `One section runs ${longest} words without a subheading. Split it to keep under ${L.sectionWords}.` : `${parsed.headings.length} subheadings, with well-sized sections.`);
  }

  add('content-lists', 'content', 2, parsed.lists ? 'good' : 'ok', parsed.lists ? 'Uses bullet lists, which Google sometimes shows as featured snippets.' : 'Consider a bullet list (- item) for steps or tips; they are easy to scan.');

  /* Links */
  const internal = parsed.links.filter(isInternalLink).length;
  const external = parsed.links.length - internal;
  add('links-internal', 'links', 5, internal ? 'good' : 'bad',
    internal ? `${internal} internal ${internal === 1 ? 'link' : 'links'} to other pages of the shop.` : 'Add a link to another article, a product or the repairs page, e.g. [book a repair](/repairs).');
  add('links-external', 'links', 2, external ? 'good' : 'ok',
    external ? `${external} outbound ${external === 1 ? 'link' : 'links'} to other websites.` : 'Linking to a trustworthy source (e.g. the manufacturer) can add credibility.');

  /* Readability */
  const sentences = sentencesOf(parsed.paragraphs);
  const sentenceWords = sentences.map((s) => words(s).length);
  const totalSentenceWords = sentenceWords.reduce((a, b) => a + b, 0);
  const allWords = sentences.flatMap((s) => s.split(/\s+/));
  const syl = allWords.reduce((a, w) => a + syllables(w, ctx.lang), 0);
  const asl = sentences.length ? totalSentenceWords / sentences.length : 0;
  const asw = allWords.length ? syl / allWords.length : 0;
  const readingEase = sentences.length ? Math.max(0, Math.min(100, (ctx.lang === 'pt' ? 248.835 : 206.835) - 1.015 * asl - 84.6 * asw)) : 0;

  if (bodyWords >= 50) {
    const re = Math.round(readingEase);
    add('read-ease', 'readability', 4, re >= 60 ? 'good' : re >= 40 ? 'ok' : 'bad',
      re >= 60 ? `Reading ease ${re}/100: easy to read.` : re >= 40 ? `Reading ease ${re}/100: fairly difficult. Use shorter sentences and simpler words.` : `Reading ease ${re}/100: hard to read. Use shorter sentences and simpler words.`);

    const maxWords = ctx.lang === 'pt' ? 25 : 20;
    const long = sentenceWords.filter((n) => n > maxWords).length;
    const share = sentences.length ? (long * 100) / sentences.length : 0;
    add('read-sentences', 'readability', 3, share <= 25 ? 'good' : share <= 35 ? 'ok' : 'bad',
      share <= 25 ? 'Sentences are a comfortable length.' : `${Math.round(share)}% of sentences have more than ${maxWords} words. Keep that under 25%.`);

    const longParas = parsed.paragraphs.filter((p) => words(p).length > L.paragraphWords).length;
    add('read-paragraphs', 'readability', 3, longParas ? 'ok' : 'good',
      longParas ? `${longParas} ${longParas === 1 ? 'paragraph is' : 'paragraphs are'} over ${L.paragraphWords} words. Shorter paragraphs read better on phones.` : 'Paragraphs are short enough to read comfortably on a phone.');

    if (sentences.length >= 5) {
      const transitions = sentences.filter((x) => TRANSITIONS[ctx.lang].test(` ${normalize(x)} `)).length;
      const tShare = Math.round((transitions * 100) / sentences.length);
      add('read-transitions', 'readability', 2, tShare >= 30 ? 'good' : tShare >= 20 ? 'ok' : 'bad',
        tShare >= 30 ? `${tShare}% of sentences use transition words, so the text flows well.` : `Only ${tShare}% of sentences use transition words (${ctx.lang === 'pt' ? 'por exemplo, além disso, no entanto' : 'for example, however, because, so'}). Aim for 30%.`);

      const passive = sentences.filter((x) => PASSIVE[ctx.lang].test(x.toLowerCase())).length;
      const pShare = Math.round((passive * 100) / sentences.length);
      add('read-passive', 'readability', 2, pShare <= 10 ? 'good' : pShare <= 15 ? 'ok' : 'bad',
        pShare <= 10 ? 'Mostly active voice: clear and direct.' : `${pShare}% of sentences use the passive voice (“the screen was replaced”). Prefer active voice (“we replace the screen”); keep it under 10%.`);
    }
  }

  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + c.weight * (c.status === 'good' ? 1 : c.status === 'ok' ? 0.5 : 0), 0);
  const score = total ? Math.round((got * 100) / total) : 0;
  for (const c of checks) c.gain = total ? (c.weight * (c.status === 'bad' ? 1 : c.status === 'ok' ? 0.5 : 0) * 100) / total : 0;

  return {
    score,
    status: scoreStatus(score),
    checks,
    stats: {
      words: bodyWords,
      readingMinutes: Math.max(1, Math.round(bodyWords / 200)),
      keywordCount,
      density,
      headings: parsed.headings.length,
      paragraphs: parsed.paragraphs.length,
      internalLinks: internal,
      externalLinks: external,
      readingEase,
      avgSentenceWords: asl,
      displayTitle: title,
      displayDescription: description,
    },
  };
}

/* ---------- reading articles ---------- */

/** The SEO-related columns of a blog post, as stored or as typed into the form. */
export type SeoFields = Record<
  'title' | 'title_pt' | 'excerpt' | 'excerpt_pt' | 'body' | 'body_pt' | 'focus_keyword' | 'focus_keyword_pt'
  | 'seo_title' | 'seo_title_pt' | 'seo_description' | 'seo_description_pt' | 'image_alt' | 'image_alt_pt'
  | 'related_keywords' | 'related_keywords_pt',
  string
>;

/**
 * The draft for one language. Portuguese visitors see English text wherever a Portuguese field is
 * blank, so the Portuguese draft falls back the same way. Returns null when there is no Portuguese article.
 */
export function draftFor(row: SeoFields, lang: SeoLang): SeoDraft | null {
  if (lang === 'en') {
    return { title: row.title, seoTitle: row.seo_title, excerpt: row.excerpt, seoDescription: row.seo_description, body: row.body, keyword: row.focus_keyword, imageAlt: row.image_alt, related: row.related_keywords };
  }
  if (!row.body_pt?.trim()) return null;
  const pt = (k: keyof SeoFields, fallback: keyof SeoFields) => row[k]?.trim() ? row[k] : row[fallback];
  return {
    title: pt('title_pt', 'title'), seoTitle: row.seo_title_pt, excerpt: pt('excerpt_pt', 'excerpt'), seoDescription: row.seo_description_pt,
    body: row.body_pt, keyword: row.focus_keyword_pt, imageAlt: pt('image_alt_pt', 'image_alt'), related: row.related_keywords_pt,
  };
}

/** Peers in one language: the title and keyword a visitor in that language sees. */
export function peersFor(rows: (SeoFields & { id: number; slug: string })[], lang: SeoLang, selfId?: number): SeoPeer[] {
  return rows.filter((r) => r.id !== selfId).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: lang === 'pt' && r.title_pt?.trim() ? r.title_pt : r.title,
    keyword: lang === 'pt' ? r.focus_keyword_pt : r.focus_keyword,
  }));
}

/**
 * Other articles worth linking to from this body: not linked yet, ranked by how many of their
 * keyword and title words the body already uses.
 */
export function linkSuggestions(body: string, peers: SeoPeer[], limit = 4): SeoPeer[] {
  const parsed = parseBody(body);
  const linked = new Set(parsed.links);
  const bodyWords = new Set(words(parsed.text).filter((w) => w.length > 3));
  return peers
    .filter((p) => !linked.has(`/blog/${p.slug}`))
    .map((p) => {
      const terms = new Set(words(`${p.keyword} ${p.title}`).filter((w) => w.length > 3));
      let hits = 0;
      for (const t of terms) if (bodyWords.has(t)) hits++;
      return { p, hits: hits + (p.keyword && has(parsed.text, p.keyword) ? 3 : 0) };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((x) => x.p);
}

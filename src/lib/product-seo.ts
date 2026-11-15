/*
 * Product SEO analysis, built on the shared helpers in lib/seo.ts. Pure functions with no server
 * imports: the product editor scores live as the admin types, and Admin -> Products shows the same scores.
 *
 * Products differ from articles: the text is shorter, there are no headings or links, and what
 * matters is a clear name, a real description, features, specifications, photos, brand and category.
 */

import {
  checkList, countPhrase, displayDescription, displayTitle, has, listingChecks, normalize, parseBody, readingEaseOf,
  sentencesOf, splitPhrases, words, type SeoContext, type SeoLang, type SeoPeer, type SeoReport,
} from './seo.ts';

export interface ProductSeoDraft {
  name: string;
  seoTitle: string;
  shortDesc: string;
  seoDescription: string;
  description: string;
  /** One feature per line. */
  features: string;
  /** One "Name: Value" per line. */
  specs: string;
  keyword: string;
  related: string;
  imageAlt: string;
  brand: string;
  category: string;
  images: number;
}

export const PRODUCT_LIMITS = {
  words: { ok: 60, good: 150 },
  density: { min: 0.5, max: 3, stuffing: 5 },
  features: 3,
  specs: 4,
  images: 3,
} as const;

/** Short names for each product check, for the dashboard's list of common issues. */
export const PRODUCT_CHECK_LABELS: Record<string, string> = {
  'kw-set': 'No focus keyword',
  'kw-title': 'Keyword missing from SEO title',
  'kw-desc': 'Keyword missing from meta description',
  'kw-intro': 'Keyword missing from description opening',
  'kw-density': 'Keyword density off',
  'kw-slug': 'Keyword missing from URL',
  'kw-alt': 'Image alt text missing',
  'kw-unique': 'Keyword used by another product',
  'kw-related': 'Related keyphrases missing',
  'meta-title': 'SEO title length',
  'meta-desc': 'Meta description length',
  'meta-unique': 'Duplicate product name',
  'meta-slug': 'Long URL',
  'content-length': 'Description too short',
  'content-features': 'Too few key features',
  'content-specs': 'Too few specifications',
  'content-images': 'Too few photos',
  'content-brand': 'No brand',
  'content-category': 'No category',
  'read-ease': 'Hard to read',
  'read-sentences': 'Long sentences',
};

const nonEmptyLines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const specCount = (s: string) => nonEmptyLines(s).filter((l) => /^[^:]+:\s*\S/.test(l)).length;

export function analyzeProductSeo(draft: ProductSeoDraft, ctx: SeoContext): SeoReport {
  const L = PRODUCT_LIMITS;
  const kw = draft.keyword.trim();
  const kwNorm = normalize(kw);
  const kwWords = kwNorm ? kwNorm.split(' ').length : 0;
  const peers = (ctx.peers ?? []).filter((p) => p.id !== ctx.selfId);
  const features = nonEmptyLines(draft.features);
  const parsed = parseBody(draft.description);
  // Everything a shopper reads on the page: the description and the feature list.
  const pageText = [draft.name, parsed.text, ...features].join('\n');
  const descWords = words(parsed.text).length;
  const textWords = words(pageText).length;
  const title = displayTitle({ title: draft.name, seoTitle: draft.seoTitle }, ctx.siteName);
  const description = displayDescription({ excerpt: draft.shortDesc, seoDescription: draft.seoDescription });
  const { add, finish } = checkList();

  /* Focus keyword */
  const keywordCount = kw ? countPhrase(pageText, kw) : 0;
  const density = textWords && kwWords ? (keywordCount * kwWords * 100) / textWords : 0;
  if (!kw) {
    add('kw-set', 'keyword', 8, 'bad', 'Set a focus keyword: what shoppers type into Google to find this product, e.g. “iPhone 15 Pro 256GB”.');
  } else {
    add('kw-set', 'keyword', 8, kwWords > 6 ? 'ok' : 'good', kwWords > 6 ? `The focus keyword has ${kwWords} words. Shorter phrases are easier to rank for.` : `Focus keyword set: “${kw}”.`);

    const titleText = draft.seoTitle.trim() || draft.name;
    if (normalize(titleText).startsWith(kwNorm)) add('kw-title', 'keyword', 9, 'good', 'The focus keyword starts the SEO title.');
    else if (has(titleText, kw)) add('kw-title', 'keyword', 9, 'ok', 'The focus keyword is in the SEO title. Moving it nearer the start helps.');
    else add('kw-title', 'keyword', 9, 'bad', 'Use the focus keyword in the product name or SEO title.');

    add('kw-desc', 'keyword', 6, has(description, kw) ? 'good' : 'bad',
      has(description, kw) ? 'The focus keyword is in the meta description.' : 'Use the focus keyword in the short description (or the meta description).');

    const opening = parsed.paragraphs[0] ?? '';
    add('kw-intro', 'keyword', 5, has(opening, kw) ? 'good' : 'bad',
      has(opening, kw) ? 'The description opens with the focus keyword.' : 'Mention the focus keyword in the first paragraph of the full description.');

    const pct = density.toFixed(1);
    if (!keywordCount) add('kw-density', 'keyword', 5, 'bad', 'The focus keyword never appears in the description or features.');
    else if (density > L.density.stuffing) add('kw-density', 'keyword', 5, 'bad', `Keyword density is ${pct}% (${keywordCount}×). That looks like keyword stuffing; aim for ${L.density.min}–${L.density.max}%.`);
    else if (density > L.density.max) add('kw-density', 'keyword', 5, 'ok', `Keyword density is ${pct}% (${keywordCount}×), a little high. Aim for ${L.density.min}–${L.density.max}%.`);
    else if (density < L.density.min) add('kw-density', 'keyword', 5, 'ok', `Keyword density is ${pct}% (${keywordCount}×). Use the keyword once or twice more in the description.`);
    else add('kw-density', 'keyword', 5, 'good', `Keyword density is ${pct}% (${keywordCount}×), within ${L.density.min}–${L.density.max}%.`);

    if (ctx.checkSlug) {
      const slugText = ctx.slug.replace(/-/g, ' ');
      add('kw-slug', 'keyword', 3, has(slugText, kw) ? 'good' : 'ok',
        has(slugText, kw) ? 'The focus keyword is in the URL.' : 'Consider putting the focus keyword in the URL slug (only for new products: changing it breaks old links).');
    }

    add('kw-alt', 'keyword', 3, !draft.imageAlt.trim() ? 'bad' : has(draft.imageAlt, kw) ? 'good' : 'ok',
      !draft.imageAlt.trim() ? 'Describe the main photo in its alt text, e.g. “Blue iPhone 15 Pro, front and back”.' : has(draft.imageAlt, kw) ? 'The main photo’s alt text includes the focus keyword.' : 'The main photo has alt text. Including the focus keyword helps Google Images.');

    const clash = peers.find((p) => normalize(p.keyword) === kwNorm);
    add('kw-unique', 'keyword', 5, clash ? 'bad' : 'good',
      clash ? `“${clash.title}” already targets this keyword. Give each product its own phrase, e.g. add the model or storage size.` : 'No other product targets this keyword.');

    const related = splitPhrases(draft.related).filter((r) => normalize(r) !== kwNorm);
    if (!related.length) add('kw-related', 'keyword', 3, 'ok', 'Add 2–4 related keyphrases (other names, model numbers, “for iPhone 15”…) and use them in the text.');
    else {
      const missing = related.filter((r) => !has(pageText, r));
      add('kw-related', 'keyword', 3, !missing.length ? 'good' : missing.length < related.length ? 'ok' : 'bad',
        !missing.length ? `All ${related.length} related keyphrases appear in the description or features.` : `Use these related keyphrases in the description or features: ${missing.map((m) => `“${m}”`).join(', ')}.`);
    }
  }

  /* Search listing */
  listingChecks(add, { title, description, name: draft.name, peers, ctx, noun: 'product', collection: 'shop' });

  /* Content */
  if (descWords >= L.words.good) add('content-length', 'content', 7, 'good', `The description has ${descWords} words: enough detail to rank and to sell.`);
  else if (descWords >= L.words.ok) add('content-length', 'content', 7, 'ok', `The description has ${descWords} words. Aim for ${L.words.good}+: who it is for, what is in the box, how it compares.`);
  else add('content-length', 'content', 7, 'bad', `The description has ${descWords} words. Write at least ${L.words.ok}; Google ranks thin product pages poorly, and shoppers need the detail.`);

  const nf = features.length;
  add('content-features', 'content', 4, nf >= L.features ? 'good' : nf ? 'ok' : 'bad',
    nf >= L.features ? `${nf} key features listed.` : `${nf ? `Only ${nf}` : 'No'} key ${nf === 1 ? 'feature' : 'features'}. List at least ${L.features}; shoppers scan them first.`);

  const ns = specCount(draft.specs);
  add('content-specs', 'content', 4, ns >= L.specs ? 'good' : ns ? 'ok' : 'bad',
    ns >= L.specs ? `${ns} specifications listed.` : `${ns ? `Only ${ns}` : 'No'} ${ns === 1 ? 'specification' : 'specifications'}. Add at least ${L.specs} (size, battery, storage…); people search for them.`);

  const ni = draft.images;
  add('content-images', 'content', 6, ni >= L.images ? 'good' : ni ? 'ok' : 'bad',
    ni >= L.images ? `${ni} photos.` : `${ni ? `Only ${ni}` : 'No'} ${ni === 1 ? 'photo' : 'photos'}. Add at least ${L.images} (front, back, in use); products with more photos sell and rank better.`);

  add('content-brand', 'content', 2, draft.brand.trim() ? 'good' : 'ok', draft.brand.trim() ? `Brand set: ${draft.brand.trim()}.` : 'Set the brand: many shoppers search by brand, and Google shows it in results.');
  add('content-category', 'content', 3, draft.category.trim() ? 'good' : 'bad', draft.category.trim() ? `In the ${draft.category.trim()} category.` : 'Choose a category so the product appears in the shop menus and category pages.');

  /* Readability */
  const sentences = sentencesOf(parsed.paragraphs);
  const { ease, asl, sentenceWords } = readingEaseOf(sentences, ctx.lang);
  if (descWords >= 50) {
    const re = Math.round(ease);
    add('read-ease', 'readability', 3, re >= 60 ? 'good' : re >= 40 ? 'ok' : 'bad',
      re >= 60 ? `Reading ease ${re}/100: easy to read.` : `Reading ease ${re}/100: ${re >= 40 ? 'fairly difficult' : 'hard to read'}. Use shorter sentences and plainer words.`);
    const maxWords = ctx.lang === 'pt' ? 25 : 20;
    const share = sentences.length ? (sentenceWords.filter((n) => n > maxWords).length * 100) / sentences.length : 0;
    add('read-sentences', 'readability', 2, share <= 25 ? 'good' : share <= 35 ? 'ok' : 'bad',
      share <= 25 ? 'Sentences are a comfortable length.' : `${Math.round(share)}% of sentences have more than ${maxWords} words. Keep that under 25%.`);
  }

  return finish({
    words: descWords,
    readingMinutes: Math.max(1, Math.round(descWords / 200)),
    keywordCount,
    density,
    headings: 0,
    paragraphs: parsed.paragraphs.length,
    internalLinks: 0,
    externalLinks: 0,
    readingEase: ease,
    avgSentenceWords: asl,
    displayTitle: title,
    displayDescription: description,
    images: ni,
    features: nf,
    specs: ns,
  });
}

/** The SEO-related product columns, as stored or as typed into the form. */
export type ProductSeoFields = Record<
  'name' | 'name_pt' | 'short_desc' | 'short_desc_pt' | 'description' | 'description_pt' | 'features' | 'features_pt'
  | 'specs' | 'specs_pt' | 'brand' | 'focus_keyword' | 'focus_keyword_pt' | 'related_keywords' | 'related_keywords_pt'
  | 'seo_title' | 'seo_title_pt' | 'seo_description' | 'seo_description_pt' | 'image_alt' | 'image_alt_pt',
  string
>;

/**
 * The draft for one language. Portuguese visitors see English text wherever a Portuguese field is
 * blank, so the Portuguese draft falls back the same way. Returns null when nothing is translated.
 */
export function productDraftFor(row: ProductSeoFields, lang: SeoLang, extra: { category: Record<SeoLang, string>; images: number }): ProductSeoDraft | null {
  const base = { brand: row.brand, images: extra.images };
  if (lang === 'en') {
    return {
      ...base, name: row.name, seoTitle: row.seo_title, shortDesc: row.short_desc, seoDescription: row.seo_description, description: row.description,
      features: row.features, specs: row.specs, keyword: row.focus_keyword, related: row.related_keywords, imageAlt: row.image_alt, category: extra.category.en,
    };
  }
  if (!row.name_pt?.trim() && !row.description_pt?.trim()) return null;
  const pt = (k: keyof ProductSeoFields, fallback: keyof ProductSeoFields) => (row[k]?.trim() ? row[k] : row[fallback]);
  return {
    ...base, name: pt('name_pt', 'name'), seoTitle: row.seo_title_pt, shortDesc: pt('short_desc_pt', 'short_desc'), seoDescription: row.seo_description_pt,
    description: pt('description_pt', 'description'), features: pt('features_pt', 'features'), specs: pt('specs_pt', 'specs'),
    keyword: row.focus_keyword_pt, related: row.related_keywords_pt, imageAlt: pt('image_alt_pt', 'image_alt'), category: extra.category.pt || extra.category.en,
  };
}

/** Other products in one language, for duplicate keyword and name checks. */
export function productPeers(rows: (ProductSeoFields & { id: number; slug: string })[], lang: SeoLang): SeoPeer[] {
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: lang === 'pt' && r.name_pt?.trim() ? r.name_pt : r.name,
    keyword: lang === 'pt' ? r.focus_keyword_pt : r.focus_keyword,
  }));
}

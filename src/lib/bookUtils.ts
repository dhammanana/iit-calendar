import { PaliScript } from '../types';
import { TextProcessor, Script } from './pali-script';
import { SCRIPTS } from '../services/conversionService';
import rawBooksMetadata from '../data/books/books.json';
import { BookItem, BookSection, ParsedBook, SearchResultItem, H3Item } from '../types/book';

// Force Vite HMR re-evaluation for raw HTML glob imports
const htmlModules = import.meta.glob<string>('../data/books/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const booksList: BookItem[] = rawBooksMetadata as BookItem[];

export function getBookHtml(fileName: string): string {
  const matchKey = Object.keys(htmlModules).find(k => k.endsWith('/' + fileName) || k.endsWith(fileName));
  if (matchKey && htmlModules[matchKey]) {
    return htmlModules[matchKey];
  }
  return '<p>Book content not found.</p>';
}

export function getScriptKey(paliScript: PaliScript): string {
  return SCRIPTS[paliScript] || Script.RO;
}

export function convertScriptText(text: string, scriptKey: string): string {
  if (!text || scriptKey === Script.RO) return text;
  try {
    const baseScriptText = TextProcessor.convertFrom(text, Script.RO);
    return TextProcessor.convert(baseScriptText, scriptKey);
  } catch {
    return text;
  }
}

export function parseH3sFromHtml(htmlSnippet: string): H3Item[] {
  const items: H3Item[] = [];
  const regex = /<h3([^>]*?id="([^"]*?)")?[^>]*?>/gi;
  let match;
  while ((match = regex.exec(htmlSnippet)) !== null) {
    const attrs = match[0];
    const id = match[2] || '';
    const i18nKeyMatch = attrs.match(/data-i18n-key="([^"]+)"/);
    const i18nKey = i18nKeyMatch ? i18nKeyMatch[1] : undefined;
    const rest = htmlSnippet.slice(match.index + match[0].length);
    const closeIdx = rest.indexOf('</h3>');
    const inner = closeIdx >= 0 ? rest.slice(0, closeIdx) : '';
    const title = inner.replace(/<[^>]+>/g, '').trim();
    items.push({ id, title, i18nKey });
  }
  return items;
}

export function parseBookSections(rawHtml: string): ParsedBook {
  if (!rawHtml) return { h1Groups: [], allSections: [] };

  const headingRegex = /<(h[12])([^>]*?id="([^"]*?)")?[^>]*?>([\s\S]*?)<\/h[12]>/gi;
  const matches: { index: number; fullLength: number; tag: 'h1' | 'h2'; id: string; title: string }[] = [];
  let match;

  while ((match = headingRegex.exec(rawHtml)) !== null) {
    const tag = match[1].toLowerCase() as 'h1' | 'h2';
    const id = match[3] || `section-${matches.length + 1}`;
    const title = match[4].replace(/<[^>]+>/g, '').trim();
    matches.push({
      index: match.index,
      fullLength: match[0].length,
      tag,
      id,
      title
    });
  }

  if (matches.length === 0) {
    const defaultSec: BookSection = {
      id: 'main-section',
      h1Title: '',
      h2Title: 'Full Content',
      h3Items: parseH3sFromHtml(rawHtml),
      html: rawHtml
    };
    return {
      h1Groups: [{ h1Title: '', sections: [defaultSec] }],
      allSections: [defaultSec]
    };
  }

  const allSections: BookSection[] = [];
  const h1Map = new Map<string, BookSection[]>();
  let currentH1Title = '';

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : rawHtml.length;
    const htmlSnippet = rawHtml.substring(current.index, nextIndex);

    if (current.tag === 'h1') {
      currentH1Title = current.title;
      const contentAfterH1 = htmlSnippet.substring(current.fullLength).trim();
      const hasSubHeading = /<h2/i.test(contentAfterH1);

      if (!hasSubHeading && contentAfterH1.length > 0) {
        const sec: BookSection = {
          id: current.id,
          h1Title: currentH1Title,
          h2Title: current.title,
          h3Items: parseH3sFromHtml(htmlSnippet),
          html: htmlSnippet
        };
        allSections.push(sec);
        if (!h1Map.has(currentH1Title)) h1Map.set(currentH1Title, []);
        h1Map.get(currentH1Title)!.push(sec);
      }
    } else if (current.tag === 'h2') {
      const groupName = currentH1Title || 'General';
      const sec: BookSection = {
        id: current.id,
        h1Title: groupName,
        h2Title: current.title,
        h3Items: parseH3sFromHtml(htmlSnippet),
        html: htmlSnippet
      };
      allSections.push(sec);
      if (!h1Map.has(groupName)) h1Map.set(groupName, []);
      h1Map.get(groupName)!.push(sec);
    }
  }

  const h1Groups = Array.from(h1Map.entries()).map(([h1Title, sections]) => ({
    h1Title,
    sections
  }));

  return { h1Groups, allSections };
}

/**
 * Extracts a structured index of all headings and text blocks from a book's raw HTML.
 */
export function parseBookSearchIndex(book: BookItem, rawHtml: string): SearchResultItem[] {
  if (!rawHtml) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const results: SearchResultItem[] = [];

  let currentH1 = '';
  let currentH1Id = '';
  let currentH2 = '';
  let currentH2Id = '';
  let currentH3 = '';
  let currentH3Id = '';

  const traverse = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1') {
        const title = el.textContent?.replace(/<[^>]+>/g, '').trim() || '';
        if (title) {
          const id = el.id || `h1-${results.length}`;
          currentH1 = title;
          currentH1Id = id;
          currentH2 = '';
          currentH2Id = '';
          currentH3 = '';
          currentH3Id = '';
          results.push({
            id: `sr-${book.id}-h1-${results.length}`,
            bookId: book.id,
            bookTitle: book.title,
            h1Title: title,
            type: 'h1',
            title,
            targetId: id,
            textToMatch: title,
          });
        }
        return;
      }

      if (tagName === 'h2') {
        const title = el.textContent?.replace(/<[^>]+>/g, '').trim() || '';
        if (title) {
          const id = el.id || `h2-${results.length}`;
          currentH2 = title;
          currentH2Id = id;
          currentH3 = '';
          currentH3Id = '';
          results.push({
            id: `sr-${book.id}-h2-${results.length}`,
            bookId: book.id,
            bookTitle: book.title,
            h1Title: currentH1,
            h2Title: title,
            type: 'h2',
            title,
            sectionId: id,
            targetId: id,
            textToMatch: title,
          });
        }
        return;
      }

      if (tagName === 'h3') {
        const title = el.textContent?.replace(/<[^>]+>/g, '').trim() || '';
        if (title) {
          const id = el.id || `h3-${results.length}`;
          currentH3 = title;
          currentH3Id = id;
          results.push({
            id: `sr-${book.id}-h3-${results.length}`,
            bookId: book.id,
            bookTitle: book.title,
            h1Title: currentH1,
            h2Title: currentH2,
            h3Title: title,
            type: 'h3',
            title,
            sectionId: currentH2Id || currentH1Id,
            targetId: id,
            textToMatch: title,
          });
        }
        return;
      }

      if (['p', 'li', 'td', 'blockquote'].includes(tagName)) {
        const text = el.textContent?.trim() || '';
        if (text.length >= 3) {
          const id = el.id || `txt-${results.length}`;
          results.push({
            id: `sr-${book.id}-txt-${results.length}`,
            bookId: book.id,
            bookTitle: book.title,
            h1Title: currentH1,
            h2Title: currentH2,
            h3Title: currentH3,
            type: 'text',
            title: text,
            sectionId: currentH2Id || currentH1Id,
            targetId: id,
            textToMatch: text,
          });
        }
        return;
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        traverse(el.childNodes[i]);
      }
    }
  };

  for (let i = 0; i < doc.body.childNodes.length; i++) {
    traverse(doc.body.childNodes[i]);
  }

  return results;
}

/**
 * Searches across indexed book items for matching query terms, supporting script conversions.
 */
export function getSearchResults(
  query: string,
  searchIndex: SearchResultItem[],
  scriptKey: string
): { item: SearchResultItem; matchSnippet?: string }[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const lowerQuery = trimmed.toLowerCase();

  let convertedQuery = lowerQuery;
  if (scriptKey !== Script.RO) {
    try {
      const baseScriptText = TextProcessor.convertFrom(trimmed, Script.RO);
      convertedQuery = TextProcessor.convert(baseScriptText, scriptKey).toLowerCase();
    } catch {
      convertedQuery = lowerQuery;
    }
  }

  const results: { item: SearchResultItem; matchSnippet?: string }[] = [];

  for (const item of searchIndex) {
    const textLower = item.textToMatch.toLowerCase();
    let convertedTextLower = textLower;

    if (scriptKey !== Script.RO) {
      try {
        const baseScriptText = TextProcessor.convertFrom(item.textToMatch, Script.RO);
        convertedTextLower = TextProcessor.convert(baseScriptText, scriptKey).toLowerCase();
      } catch {
        convertedTextLower = textLower;
      }
    }

    let matchIdx = textLower.indexOf(lowerQuery);
    let matchedInConverted = false;
    let actualQuery = lowerQuery;

    if (matchIdx === -1 && convertedQuery !== lowerQuery) {
      matchIdx = convertedTextLower.indexOf(convertedQuery);
      if (matchIdx !== -1) {
        matchedInConverted = true;
        actualQuery = convertedQuery;
      }
    }

    if (matchIdx === -1 && convertedTextLower.indexOf(lowerQuery) !== -1) {
      matchIdx = convertedTextLower.indexOf(lowerQuery);
      matchedInConverted = true;
      actualQuery = lowerQuery;
    }

    if (matchIdx !== -1) {
      let snippet: string | undefined = undefined;
      if (item.type === 'text') {
        const targetStr = matchedInConverted ? convertedTextLower : item.textToMatch;
        const start = Math.max(0, matchIdx - 40);
        const end = Math.min(targetStr.length, matchIdx + actualQuery.length + 50);
        snippet = (start > 0 ? '...' : '') + targetStr.substring(start, end) + (end < targetStr.length ? '...' : '');
      }

      results.push({
        item,
        matchSnippet: snippet
      });
    }
  }

  return results;
}

/** Maps a Pāḷi script key to the i18n language code used for chant notes. */
export const SCRIPT_TO_LANG: Record<string, string> = {
  [Script.SI]: 'si',
  [Script.MY]: 'my',
  [Script.THAI]: 'th',
  [Script.KM]: 'km',
  [Script.LAOS]: 'lo',
};

export function getBookTitle(book: BookItem, t: (key: any) => string): string {
  if (book.titleKey) {
    const localized = t(book.titleKey);
    if (localized && localized !== book.titleKey) return localized;
  }
  return book.title;
}

export function getBookSubtitle(book: BookItem, t: (key: any) => string): string {
  if (book.subtitleKey) {
    const localized = t(book.subtitleKey);
    if (localized && localized !== book.subtitleKey) return localized;
  }
  return book.subtitle || '';
}

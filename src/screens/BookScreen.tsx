import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  List,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Layers,
  FileText,
  Hash,
  Quote
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUI } from '../UIContext';
import { useI18n } from '../hooks/useI18n';
import { Settings, PaliScript } from '../types';
import { TextProcessor, Script } from '../lib/pali-script';
import { SCRIPTS } from '../services/conversionService';
import rawBooksMetadata from '../data/books/books.json';

export interface BookItem {
  id: string;
  file: string;
  title: string;
  titleKey?: string;
  subtitle?: string;
  subtitleKey?: string;
  author?: string;
  coverImage?: string;
  coverColor?: string;
  accentColor?: string;
}

interface H3Item {
  id: string;
  title: string;
  i18nKey?: string;
}

interface BookSection {
  id: string;
  h1Title: string;
  h2Title: string;
  h3Items: H3Item[];
  html: string;
}

interface H1Group {
  h1Title: string;
  sections: BookSection[];
}

interface ParsedBook {
  h1Groups: H1Group[];
  allSections: BookSection[];
}

export interface SearchResultItem {
  id: string;
  bookId: string;
  bookTitle: string;
  h1Title: string;
  h2Title?: string;
  h3Title?: string;
  type: 'h1' | 'h2' | 'h3' | 'text';
  title: string;
  sectionId?: string;
  targetId?: string;
  textToMatch: string;
}

// Force Vite HMR re-evaluation for raw HTML glob imports
const htmlModules = import.meta.glob<string>('../data/books/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const booksList: BookItem[] = rawBooksMetadata as BookItem[];

function getBookHtml(fileName: string): string {
  const matchKey = Object.keys(htmlModules).find(k => k.endsWith('/' + fileName) || k.endsWith(fileName));
  if (matchKey && htmlModules[matchKey]) {
    return htmlModules[matchKey];
  }
  return '<p>Book content not found.</p>';
}

function getScriptKey(paliScript: PaliScript): string {
  return SCRIPTS[paliScript] || Script.RO;
}

function convertScriptText(text: string, scriptKey: string): string {
  if (!text || scriptKey === Script.RO) return text;
  try {
    const sinhala = TextProcessor.convertFrom(text, Script.RO);
    return TextProcessor.convert(sinhala, scriptKey);
  } catch (e) {
    return text;
  }
}

function parseH3sFromHtml(htmlSnippet: string): H3Item[] {
  const items: H3Item[] = [];
  const regex = /<h3([^>]*?id="([^"]*?)")?[^>]*?>/gi;
  let match;
  while ((match = regex.exec(htmlSnippet)) !== null) {
    const attrs = match[0];
    const id = match[2] || '';
    const i18nKeyMatch = attrs.match(/data-i18n-key="([^"]+)"/);
    const i18nKey = i18nKeyMatch ? i18nKeyMatch[1] : undefined;
    // Extract text content of the h3 element
    const rest = htmlSnippet.slice(match.index + match[0].length);
    const closeIdx = rest.indexOf('</h3>');
    const inner = closeIdx >= 0 ? rest.slice(0, closeIdx) : '';
    const title = inner.replace(/<[^>]+>/g, '').trim();
    items.push({ id, title, i18nKey });
  }
  return items;
}

function parseBookSections(rawHtml: string): ParsedBook {
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
 * Extracts a structured index of all headings and terminal page text blocks from a book's raw HTML.
 */
function parseBookSearchIndex(book: BookItem, rawHtml: string): SearchResultItem[] {
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
 * Searches across the indexed book items for matching query terms, supporting script conversions.
 */
function getSearchResults(
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
      const sinhala = TextProcessor.convertFrom(trimmed, Script.RO);
      convertedQuery = TextProcessor.convert(sinhala, scriptKey).toLowerCase();
    } catch (e) {
      convertedQuery = lowerQuery;
    }
  }

  const results: { item: SearchResultItem; matchSnippet?: string }[] = [];

  for (const item of searchIndex) {
    const textLower = item.textToMatch.toLowerCase();
    let convertedTextLower = textLower;

    if (scriptKey !== Script.RO) {
      try {
        const sinhala = TextProcessor.convertFrom(item.textToMatch, Script.RO);
        convertedTextLower = TextProcessor.convert(sinhala, scriptKey).toLowerCase();
      } catch (e) {
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
        let rawSnippet = (start > 0 ? '...' : '') + targetStr.substring(start, end) + (end < targetStr.length ? '...' : '');
        snippet = rawSnippet;
      }

      results.push({
        item,
        matchSnippet: snippet
      });
    }
  }

  return results;
}

/**
 * Highlights matching search terms inside preview text snippets.
 */
function renderSnippetWithHighlight(snippet: string, query: string, scriptKey: string) {
  if (!query || !snippet) return snippet;

  let searchPattern = query.trim();
  if (scriptKey !== Script.RO && /^[a-zA-Zāīūṃṅñṭḍṇḷḥ\s,.'"-]+$/i.test(query)) {
    try {
      const sinhala = TextProcessor.convertFrom(query, Script.RO);
      searchPattern = TextProcessor.convert(sinhala, scriptKey);
    } catch (e) {
      // fallback
    }
  }

  const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = snippet.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-200 dark:bg-amber-500/40 text-amber-900 dark:text-white rounded px-1 font-semibold not-italic"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

/** Maps a Pāḷi script key to the i18n language code used for chant notes. */
const SCRIPT_TO_LANG: Record<string, string> = {
  [Script.SI]: 'si',
  [Script.MY]: 'my',
  [Script.THAI]: 'th',
  [Script.KM]: 'km',
  [Script.LAOS]: 'lo',
};

export function BookScreen({ settings }: { settings: Settings }) {
  const { t, tFor, language } = useI18n();

  // Multi-level navigation state:
  // Level 0: selectedBookId == null => Bookshelf Grid
  // Level 1: selectedBookId != null & selectedH1Title == null & selectedSectionId == null => H1 Volumes List Page
  // Level 2: selectedBookId != null & selectedH1Title != null & selectedSectionId == null => H2 Sections List Page
  // Level 3: selectedBookId != null & selectedSectionId != null => Section Reader Page
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedH1Title, setSelectedH1Title] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [showToc, setShowToc] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);

  const selectedBook = useMemo(() => {
    return booksList.find(b => b.id === selectedBookId) || null;
  }, [selectedBookId]);

  const rawHtml = useMemo(() => {
    if (!selectedBook) return '';
    return getBookHtml(selectedBook.file);
  }, [selectedBook]);

  const parsedBook = useMemo(() => {
    if (!rawHtml) return { h1Groups: [], allSections: [] };
    return parseBookSections(rawHtml);
  }, [rawHtml]);

  // Build comprehensive search index across selected book (or all books if in catalog view)
  const searchIndex = useMemo(() => {
    if (selectedBook) {
      return parseBookSearchIndex(selectedBook, rawHtml);
    } else {
      let combined: SearchResultItem[] = [];
      for (const book of booksList) {
        const html = getBookHtml(book.file);
        combined = combined.concat(parseBookSearchIndex(book, html));
      }
      return combined;
    }
  }, [selectedBook, rawHtml]);

  const scriptKey = getScriptKey(settings.paliScript);

  // Compute live search results
  const searchResults = useMemo(() => {
    return getSearchResults(searchTerm, searchIndex, scriptKey);
  }, [searchTerm, searchIndex, scriptKey]);

  // If book has only 1 H1 group (or 1 group overall), auto-select it if not selected
  useEffect(() => {
    if (parsedBook.h1Groups.length === 1 && selectedH1Title === null && selectedBookId !== null) {
      setSelectedH1Title(parsedBook.h1Groups[0].h1Title);
    }
  }, [parsedBook, selectedBookId, selectedH1Title]);

  const scrollToContainerTop = () => {
    const container = document.getElementById('tab-book');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'instant' });
      container.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Auto-scroll to top whenever book, H1 volume, or section navigation state changes
  useEffect(() => {
    scrollToContainerTop();
  }, [selectedBookId, selectedH1Title, selectedSectionId]);

  const scrollToId = (id?: string) => {
    setShowToc(false);
    setTimeout(() => {
      if (id) {
        const el = document.getElementById(id);
        const container = document.getElementById('tab-book');
        if (el) {
          if (container) {
            const topPos = el.getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top - 80;
            container.scrollTo({ top: topPos, behavior: 'smooth' });
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }

      // Fallback scroll to active highlighted match inside container
      const container = document.getElementById('tab-book');
      const mark = document.querySelector('mark');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 200);
  };

  const selectedH1Group = useMemo(() => {
    if (selectedH1Title === null) return null;
    return parsedBook.h1Groups.find(g => g.h1Title === selectedH1Title) || parsedBook.h1Groups[0] || null;
  }, [selectedH1Title, parsedBook]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    return parsedBook.allSections.find(s => s.id === selectedSectionId) || parsedBook.allSections[0] || null;
  }, [selectedSectionId, parsedBook]);

  const currentSectionIndex = useMemo(() => {
    if (!selectedSection) return -1;
    return parsedBook.allSections.findIndex(s => s.id === selectedSection.id);
  }, [selectedSection, parsedBook]);

  const contentRef = useRef<HTMLDivElement>(null);

  const processedSectionHtml = useMemo(() => {
    if (!selectedSection) return '';
    let html = selectedSection.html;

    // Chant notes should follow the active Pāḷi script, not the UI language.
    // e.g. Sinhala script → show notes in Sinhala even if UI is English.
    const chantNoteLang = SCRIPT_TO_LANG[scriptKey] || language;

    // Process data-i18n-key attribute translations
    html = html.replace(/<([a-z0-9]+)([^>]*?)data-i18n-key="([^"]+)"([^>]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, beforeAttrs, key, afterAttrs, content) => {
      const translated = tFor(chantNoteLang, key) || content;
      return `<${tag}${beforeAttrs}data-i18n-key="${key}" data-no-transliterate="true"${afterAttrs}>${translated}</${tag}>`;
    });

    if (scriptKey !== Script.RO) {
      const tagRegex = /(<[^>]+>)/g;
      const parts = html.split(tagRegex);
      let skipTransliteration = false;

      html = parts.map((part, index) => {
        if (index % 2 === 1) {
          if (/data-no-transliterate="true"/i.test(part) || /class="[^"]*chant-note[^"]*"/i.test(part)) {
            if (!part.startsWith('</')) {
              skipTransliteration = true;
            }
          }
          if (part.startsWith('</') && skipTransliteration) {
            skipTransliteration = false;
          }
          return part;
        } else {
          if (skipTransliteration || !part.trim()) return part;
          if (part.length === 1 && /[\s,.;:!?]/.test(part)) return part;

          try {
            const sinhala = TextProcessor.convertFrom(part, Script.RO);
            return TextProcessor.convert(sinhala, scriptKey);
          } catch (e) {
            return part;
          }
        }
      }).join('');
    }

    if (searchTerm.trim() && searchTerm.length >= 2) {
      let searchPattern = searchTerm;
      if (scriptKey !== Script.RO && /^[a-zA-Zāīūṃṅñṭḍṇḷḥ\s,.'"-]+$/i.test(searchTerm)) {
        try {
          const sinhala = TextProcessor.convertFrom(searchTerm, Script.RO);
          searchPattern = TextProcessor.convert(sinhala, scriptKey);
        } catch (e) {
          console.error("Search term conversion failed", e);
        }
      }

      const escapedSearch = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?![^<]*>)${escapedSearch}`, 'gi');
      html = html.replace(regex, (match) => `<mark class="bg-amber-200 dark:bg-amber-500/40 text-slate-900 dark:text-white rounded px-0.5 ring-1 ring-amber-400/50 transition-all duration-300">${match}</mark>`);
    }

    return html;
  }, [selectedSection, scriptKey, searchTerm, language, t, tFor]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2 || !selectedSection) {
      setTotalMatches(0);
      setCurrentMatchIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      if (contentRef.current) {
        const marks = contentRef.current.querySelectorAll('mark');
        setTotalMatches(marks.length);
        if (marks.length > 0) {
          setCurrentMatchIndex(0);
          marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          marks[0].classList.add('ring-2', 'ring-amber-600', 'dark:ring-amber-300', 'scale-110');
        } else {
          setCurrentMatchIndex(-1);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [processedSectionHtml, searchTerm, selectedSection]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (totalMatches === 0 || !contentRef.current) return;

    const marks = contentRef.current.querySelectorAll('mark');
    if (currentMatchIndex >= 0 && marks[currentMatchIndex]) {
      marks[currentMatchIndex].classList.remove('ring-2', 'ring-amber-600', 'dark:ring-amber-300', 'scale-110');
    }

    let nextIndex = direction === 'next' ? currentMatchIndex + 1 : currentMatchIndex - 1;
    if (nextIndex >= totalMatches) nextIndex = 0;
    if (nextIndex < 0) nextIndex = totalMatches - 1;

    setCurrentMatchIndex(nextIndex);
    if (marks[nextIndex]) {
      marks[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      marks[nextIndex].classList.add('ring-2', 'ring-amber-600', 'dark:ring-amber-300', 'scale-110');
    }
  };

  const getBookTitle = (book: BookItem) => {
    if (book.titleKey) {
      const localized = t(book.titleKey as any);
      if (localized && localized !== book.titleKey) return localized;
    }
    return book.title;
  };

  const getBookSubtitle = (book: BookItem) => {
    if (book.subtitleKey) {
      const localized = t(book.subtitleKey as any);
      if (localized && localized !== book.subtitleKey) return localized;
    }
    return book.subtitle || '';
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    setSelectedBookId(item.bookId);

    if (item.h1Title) {
      setSelectedH1Title(item.h1Title);
    }

    if (item.type === 'h1') {
      setSelectedSectionId(null);
    } else if (item.sectionId) {
      setSelectedSectionId(item.sectionId);
    }

    if (item.type === 'text') {
      setSearchTerm(searchTerm);
    } else {
      setSearchTerm(item.title);
    }

    setIsSearchFocused(false);

    // Scroll to target heading or element
    setTimeout(() => {
      scrollToId(item.targetId);
    }, 200);
  };

  const goToPrevSection = () => {
    if (currentSectionIndex > 0) {
      const prevSec = parsedBook.allSections[currentSectionIndex - 1];
      setSelectedH1Title(prevSec.h1Title);
      setSelectedSectionId(prevSec.id);
      setSearchTerm('');
      scrollToContainerTop();
    }
  };

  const goToNextSection = () => {
    if (currentSectionIndex >= 0 && currentSectionIndex < parsedBook.allSections.length - 1) {
      const nextSec = parsedBook.allSections[currentSectionIndex + 1];
      setSelectedH1Title(nextSec.h1Title);
      setSelectedSectionId(nextSec.id);
      setSearchTerm('');
      scrollToContainerTop();
    }
  };

  const handleBackNavigation = () => {
    if (selectedSectionId) {
      setSelectedSectionId(null);
    } else if (selectedH1Title !== null && parsedBook.h1Groups.length > 1) {
      setSelectedH1Title(null);
    } else {
      setSelectedBookId(null);
      setSelectedH1Title(null);
      setSelectedSectionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-slate-800 dark:text-slate-100 pb-[calc(7rem+env(safe-area-inset-bottom,24px))] selection:bg-amber-500/20">

      {/* Top Header Background Illustration */}
      <div className="w-full relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pt-6 pb-12 px-4 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-24 h-24 sm:w-28 sm:h-28 text-saffron dark:text-amber-500 transition-all duration-700 hover:scale-105 filter drop-shadow-md"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="book-pill-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff8e7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffeed0" stopOpacity="0.8" />
            </linearGradient>
            <filter id="book-pill-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#d97706" floodOpacity="0.15" />
            </filter>
          </defs>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes book-wave-pulse {
              0%   { r: 0px; opacity: 0.6; }
              100% { r: 46px; opacity: 0; }
            }
            .book-ripple {
              animation: book-wave-pulse 8s cubic-bezier(0.25, 0, 0.2, 1) infinite;
              transform-origin: 50px 50px;
            }
          ` }} />

          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="book-ripple text-yellow-600/25 dark:text-amber-500/15" style={{ animationDelay: '0s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="book-ripple text-yellow-600/25 dark:text-amber-500/15" style={{ animationDelay: '1.6s' }} />
          <circle cx="50" cy="50" r="0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0" className="book-ripple text-yellow-600/25 dark:text-amber-500/15" style={{ animationDelay: '3.2s' }} />

          <circle
            cx="50"
            cy="50"
            r="18"
            fill="url(#book-pill-bg)"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="0.4"
            filter="url(#book-pill-shadow)"
          />

          <image
            href="/scripture.png"
            x="36"
            y="36"
            width="28"
            height="28"
            style={{
              filter: 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1039%) hue-rotate(24deg) brightness(91%) contrast(101%)'
            }}
          />
        </svg>
      </div>

      {/* Card Overlay container */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col gap-4">

        {/* Static Title Header for BookScreen */}
        <div className="px-2 text-center relative flex flex-col items-center">
          <h1 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none mb-1.5">
            {t('common.books') || t('common.book') || 'Books'}
          </h1>
          {!selectedBook ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
              Dhamma texts and chanting books
            </p>
          ) : (
            /* Universal Interactive Breadcrumbs (Shown at all levels when a book is open) */
            <nav className="flex items-center justify-center flex-wrap gap-1.5 text-xs text-[var(--text-muted)] font-medium max-w-3xl mx-auto px-2 text-center mt-1">
              <button
                onClick={() => {
                  setSelectedH1Title(null);
                  setSelectedSectionId(null);
                }}
                className={cn(
                  "transition-colors",
                  selectedH1Title === null && selectedSectionId === null
                    ? "text-[var(--accent)] font-bold cursor-default"
                    : "hover:text-[var(--accent)]"
                )}
              >
                {getBookTitle(selectedBook)}
              </button>

              {selectedH1Title && selectedH1Title !== 'General' && parsedBook.h1Groups.length > 1 && (
                <>
                  <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                  <button
                    onClick={() => {
                      setSelectedSectionId(null);
                    }}
                    className={cn(
                      "transition-colors",
                      selectedSectionId === null
                        ? "text-[var(--accent)] font-bold cursor-default"
                        : "hover:text-[var(--accent)]"
                    )}
                  >
                    {convertScriptText(selectedH1Title, scriptKey)}
                  </button>
                </>
              )}

              {selectedSection && (
                <>
                  <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-[var(--accent)] font-bold line-clamp-1">
                    {convertScriptText(selectedSection.h2Title, scriptKey)}
                  </span>
                </>
              )}
            </nav>
          )}
        </div>

        {/* ── PERMANENT BOTTOM CONTROL BAR (Fixed flush above bottom navbar always) ── */}
        <div
          className="fixed left-0 right-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-4 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between gap-3"
          style={{
            bottom: 'calc(4.55rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {selectedBook && (
            <>
              {/* Back Icon Button */}
              <button
                onClick={handleBackNavigation}
                title="Back"
                className="btn-icon flex-shrink-0"
              >
                <ArrowLeft size={18} />
              </button>

              {/* Book Catalog Button */}
              <button
                onClick={() => {
                  setSelectedBookId(null);
                  setSelectedH1Title(null);
                  setSelectedSectionId(null);
                  setSearchTerm('');
                }}
                title="Book Catalog"
                className="btn-icon flex-shrink-0"
              >
                <BookOpen size={18} />
              </button>
            </>
          )}

          {/* Search Input Bar (Spans full remaining width) */}
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="text"
              placeholder={
                selectedBook
                  ? `${t('common.search')}...`
                  : `${t('common.search') || 'Search'} across all books...`
              }
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchFocused(true);
              }}
              className="w-full pl-10 pr-16 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
            />
            {searchTerm && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {selectedSectionId && (
                  <>
                    <button
                      onClick={() => navigateMatch('prev')}
                      className="p-1 hover:bg-[var(--bg-card-alt)] rounded-full text-[var(--text-muted)] transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => navigateMatch('next')}
                      className="p-1 hover:bg-[var(--bg-card-alt)] rounded-full text-[var(--text-muted)] transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Table of Contents Button (only if a book is open) */}
          {selectedBook && (
            <button
              onClick={() => setShowToc(true)}
              title="Table of Contents"
              className="btn-icon flex-shrink-0"
            >
              <List size={18} />
            </button>
          )}
        </div>

        {/* ── LEVEL 0: BOOKSHELF GRID (When no book selected) ── */}
        {!selectedBook ? (
          <div className="max-w-4xl w-full mx-auto px-2 sm:px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
              {booksList.map((book) => {
                const bookTitle = getBookTitle(book);
                const bookSubtitle = getBookSubtitle(book);

                return (
                  <motion.div
                    key={book.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setSelectedH1Title(null);
                      setSelectedSectionId(null);
                      setSearchTerm('');
                    }}
                    className="group cursor-pointer flex flex-col items-center w-full max-w-[240px]"
                  >
                    {/* 3D Hardcover Book Container */}
                    <div
                      className="relative w-full aspect-[3/4.2] rounded-r-2xl rounded-l-md shadow-xl group-hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between p-5 border-y border-r border-white/20 text-white"
                      style={{
                        background: book.coverImage
                          ? `url(${book.coverImage}) center/cover no-repeat`
                          : (book.coverColor || "linear-gradient(135deg, #78350f 0%, #451a03 55%, #1c1917 100%)")
                      }}
                    >
                      {/* Book Left Spine Shadow */}
                      <div className="absolute top-0 bottom-0 left-0 w-4 bg-black/40 border-r border-white/10 z-10 pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-4 w-1 bg-gradient-to-r from-white/20 to-transparent z-10 pointer-events-none" />

                      {!book.coverImage && (
                        <>
                          {/* Outer Decorative Frame */}
                          <div
                            className="absolute inset-2 border rounded-r-xl rounded-l-sm pointer-events-none opacity-40"
                            style={{ borderColor: book.accentColor || '#f59e0b' }}
                          />

                          {/* Top Ornament */}
                          <div className="relative z-20 flex justify-between items-center pt-1" style={{ color: book.accentColor || '#f59e0b' }}>
                            <Sparkles size={16} />
                            {book.author && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                                {book.author}
                              </span>
                            )}
                          </div>

                          {/* Center Title & Subtitle */}
                          <div className="relative z-20 my-auto text-center px-2 py-4 border-y bg-black/25 backdrop-blur-[2px] rounded-lg" style={{ borderColor: `${book.accentColor || '#f59e0b'}40` }}>
                            <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-white drop-shadow-md group-hover:text-amber-200 transition-colors">
                              {bookTitle}
                            </h2>
                            {bookSubtitle && (
                              <p className="text-xs text-white/80 mt-2 font-serif italic line-clamp-2">
                                {bookSubtitle}
                              </p>
                            )}
                          </div>

                          {/* Bottom Decorative Icon */}
                          <div className="relative z-20 flex justify-center items-center pb-1" style={{ color: book.accentColor || '#f59e0b' }}>
                            <BookOpen size={20} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Book Label below Cover */}
                    <div className="mt-3 text-center">
                      <h3 className="font-serif text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-saffron dark:group-hover:text-amber-400 transition-colors">
                        {bookTitle}
                      </h3>
                      {bookSubtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {bookSubtitle}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : selectedH1Title === null && parsedBook.h1Groups.length > 1 ? (

          /* ── LEVEL 1: H1 VOLUMES / CHAPTERS LIST PAGE ── */
          <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 py-2 space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {parsedBook.h1Groups.length} Volumes / Chapters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsedBook.h1Groups.map((group, gIdx) => {
                const displayH1 = convertScriptText(group.h1Title, scriptKey);
                const sectionCount = group.sections.length;

                return (
                  <motion.button
                    key={gIdx}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedH1Title(group.h1Title);
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl glass-card flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        <Layers size={18} />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h3 className="font-serif text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-1">
                          {displayH1 || 'General'}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                          {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : !selectedSection ? (

          /* ── LEVEL 2: H2 SECTIONS LIST PAGE (inside selected H1) ── */
          <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 py-2 space-y-4">
            {selectedH1Group && selectedH1Group.h1Title && (
              <div className="flex items-center gap-3 text-[var(--accent)] border-b-2 border-[var(--border-subtle)] pb-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Layers size={20} />
                </div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                  {convertScriptText(selectedH1Group.h1Title, scriptKey)}
                </h2>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(selectedH1Group ? selectedH1Group.sections : parsedBook.allSections).map((sec) => {
                const displayH2 = convertScriptText(sec.h2Title, scriptKey);
                const h3Count = sec.h3Items.length;

                return (
                  <motion.button
                    key={sec.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedSectionId(sec.id);
                    }}
                    className="w-full text-left py-2.5 px-3.5 rounded-xl glass-card flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-1">
                          {displayH2}
                        </h3>
                        {h3Count > 0 && (
                          <p className="text-[11px] text-[var(--text-muted)] font-sans mt-0.5 leading-none">
                            {h3Count} {h3Count === 1 ? 'topic' : 'topics'}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (

          /* ── LEVEL 3: SECTION READER VIEW (Renders active H2 section HTML) ── */
          <>
            {/* Section HTML Content */}
            <div className="book-content px-4 sm:px-8 mt-2 overflow-wrap-anywhere">
              <style>{`
              .overflow-wrap-anywhere {
                overflow-wrap: anywhere;
                word-break: break-word;
              }
              .book-container h1 {
                font-size: 2rem !important;
                border-bottom: 2px solid var(--accent);
                padding-bottom: 0.5rem;
                margin-bottom: 1.5rem !important;
                line-height: 1.2;
              }
              .book-container h2 {
                font-size: 1.6rem !important;
                color: var(--accent);
                margin-top: 1.5rem !important;
                margin-bottom: 1rem !important;
                font-weight: bold;
                line-height: 1.3;
              }
              .book-container h3 {
                font-size: 1.3rem !important;
                font-weight: 700 !important;
                font-style: normal !important;
                color: var(--accent);
                margin-top: 1.75rem !important;
                margin-bottom: 0.75rem !important;
                line-height: 1.35;
              }
              .book-container .chant-note {
                display: inline-block;
                font-style: italic;
                font-weight: 600;
                color: var(--accent);
                margin: 0 0.25rem;
              }
              .book-container div.chant-note,
              .book-container p.chant-note,
              .book-container blockquote.chant-note {
                display: block;
                border-left: 3px solid var(--accent);
                background: var(--accent-soft);
                padding: 0.5rem 0.85rem;
                margin: 0.75rem 0;
                border-radius: 0.5rem;
                font-style: normal;
                font-weight: 600;
                color: var(--text-primary);
              }
              .book-container p {
                margin-bottom: 0.6rem !important;
                font-size: 1.1rem;
              }
              .book-container li p {
                margin-bottom: 0.35rem !important;
              }
              .book-container ol {
                list-style-type: decimal !important;
                padding-left: 2rem !important;
                margin-top: 0.75rem !important;
                margin-bottom: 1rem !important;
              }
              .book-container ul {
                list-style-type: disc !important;
                padding-left: 2rem !important;
                margin-top: 0.75rem !important;
                margin-bottom: 1rem !important;
              }
              .book-container li {
                display: list-item !important;
                margin-bottom: 0.75rem !important;
              }
              .book-container li::marker {
                font-weight: bold;
                color: var(--accent);
              }
              mark {
                scroll-margin-top: 100px;
              }
            `}</style>
              <div
                ref={contentRef}
                className="book-container prose prose-stone dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-saffron dark:prose-headings:text-amber-500 max-w-none prose-a:text-saffron prose-strong:text-slate-900 dark:prose-strong:text-slate-100"
                script={scriptKey}
                dangerouslySetInnerHTML={{ __html: processedSectionHtml }}
              />
            </div>

            {/* Bottom Section Pagination Control Bar */}
            <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] flex flex-row items-center justify-between gap-2 px-2 sm:px-6">
              <button
                onClick={goToPrevSection}
                disabled={currentSectionIndex <= 0}
                className={cn(
                  "flex items-center justify-center gap-1 px-3.5 sm:px-5 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold active:scale-95 flex-shrink-0",
                  currentSectionIndex > 0
                    ? "btn-pill-ghost shadow-sm"
                    : "opacity-40 cursor-not-allowed border border-[var(--border-subtle)] text-[var(--text-muted)]"
                )}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="text-xs font-semibold text-[var(--text-muted)] flex-shrink-0 whitespace-nowrap px-1">
                {currentSectionIndex + 1} of {parsedBook.allSections.length}
              </span>

              <button
                onClick={goToNextSection}
                disabled={currentSectionIndex < 0 || currentSectionIndex >= parsedBook.allSections.length - 1}
                className={cn(
                  "flex items-center justify-center gap-1 px-3.5 sm:px-5 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold active:scale-95 flex-shrink-0",
                  currentSectionIndex >= 0 && currentSectionIndex < parsedBook.allSections.length - 1
                    ? "btn-pill-solid shadow-sm"
                    : "opacity-40 cursor-not-allowed border border-[var(--border-subtle)] text-[var(--text-muted)]"
                )}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── SEARCH RESULTS SLIDE-UP BOTTOM SHEET MODAL ── */}
        <AnimatePresence>
          {isSearchFocused && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSearchFocused(false)}
                className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
              />
              {/* Slide-Up Bottom Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] h-[75vh] bg-[var(--bg-main)] backdrop-blur-2xl z-[60] shadow-2xl border-t border-[var(--border-subtle)] flex flex-col rounded-t-[2.5rem] overflow-hidden"
              >
                {/* Grab Handle */}
                <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsSearchFocused(false)}>
                  <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-80" />
                </div>

                {/* Sticky Header inside Sheet */}
                <div className="px-4 sm:px-6 pb-3 pt-1 border-b border-[var(--border-subtle)] flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                        Search Results
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {selectedBook
                          ? `Searching in ${getBookTitle(selectedBook)}`
                          : 'Searching across all books'}
                        {searchTerm.trim().length >= 2 && ` • ${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} found`}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsSearchFocused(false)}
                      className="btn-icon"
                      title="Close search"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Embedded Input inside Sheet Header */}
                  <div className="relative w-full">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search across headings and text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Results Card List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[calc(7rem+env(safe-area-inset-bottom,24px))] scrollbar-hide">
                  {searchTerm.trim().length < 2 ? (
                    <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                      <Search size={32} className="mx-auto opacity-40 mb-2" />
                      <p className="text-sm font-medium">Type at least 2 characters to search</p>
                      <p className="text-xs opacity-75">Searches across all volumes, chapters, topics, and text</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">No matching results found</p>
                      <p className="text-xs">Try searching for a different keyword or Pali phrase</p>
                    </div>
                  ) : (
                    searchResults.map(({ item, matchSnippet }) => {
                      const displayBookTitle = getBookTitle(
                        booksList.find(b => b.id === item.bookId) || selectedBook!
                      );

                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: 1.005, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectSearchResult(item)}
                          className="glass-card p-3.5 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--accent)] cursor-pointer transition-all flex flex-col gap-2 group"
                        >
                          {/* Hierarchy Path */}
                          <div className="flex items-center flex-wrap gap-1 text-xs text-[var(--text-muted)] font-medium">
                            {!selectedBook && (
                              <>
                                <span className="font-bold text-[var(--accent)]">{displayBookTitle}</span>
                                <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                              </>
                            )}

                            {item.h1Title && (
                              <span className={cn(
                                "font-semibold",
                                item.type === 'h1' ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]"
                              )}>
                                {convertScriptText(item.h1Title, scriptKey)}
                              </span>
                            )}

                            {item.h2Title && (
                              <>
                                <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                                <span className={cn(
                                  "font-semibold",
                                  item.type === 'h2' ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]"
                                )}>
                                  {convertScriptText(item.h2Title, scriptKey)}
                                </span>
                              </>
                            )}

                            {item.h3Title && (
                              <>
                                <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                                <span className={cn(
                                  "font-semibold",
                                  item.type === 'h3' ? "text-[var(--accent)] font-bold" : "text-[var(--text-primary)]"
                                )}>
                                  {convertScriptText(item.h3Title, scriptKey)}
                                </span>
                              </>
                            )}

                            {/* Type Tag Badge */}
                            <span className="ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex-shrink-0">
                              {item.type}
                            </span>
                          </div>

                          {/* Content / Match Preview */}
                          {item.type !== 'text' ? (
                            <h4 className="font-serif text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                              {convertScriptText(item.title, scriptKey)}
                            </h4>
                          ) : (
                            <div className="text-xs sm:text-sm text-[var(--text-primary)] font-sans leading-relaxed pl-2 border-l-2 border-[var(--accent)]/40 italic">
                              {renderSnippetWithHighlight(matchSnippet || item.title, searchTerm, scriptKey)}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── TABLE OF CONTENTS NATIVE BOTTOM SHEET MODAL ── */}
        <AnimatePresence>
          {showToc && selectedBook && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowToc(false)}
                className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 max-h-[82vh] bg-[var(--bg-main)] backdrop-blur-2xl z-[60] shadow-2xl border-t border-[var(--border-subtle)] flex flex-col rounded-t-[2.5rem] overflow-hidden"
              >
                {/* Top Drag / Grab Handle */}
                <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setShowToc(false)}>
                  <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-80" />
                </div>

                <div className="flex justify-between items-center px-6 pb-4 pt-1 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">Table of Contents</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{getBookTitle(selectedBook)}</p>
                  </div>
                  <button onClick={() => setShowToc(false)} className="btn-icon"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom,24px))] scrollbar-hide">
                  {parsedBook.h1Groups.map((group, gIdx) => {
                    const displayH1 = convertScriptText(group.h1Title, scriptKey);

                    return (
                      <div key={gIdx} className="space-y-1.5">
                        {displayH1 && (
                          <button
                            onClick={() => {
                              setSelectedH1Title(group.h1Title);
                              setSelectedSectionId(null);
                              setShowToc(false);
                            }}
                            className="w-full text-left font-serif font-bold text-base text-[var(--accent)] px-3 pt-3 pb-1.5 border-b-2 border-[var(--border-subtle)] flex items-center justify-between hover:opacity-80 transition-opacity"
                          >
                            <span>{displayH1}</span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                        {group.sections.map((sec) => {
                          const displayH2 = convertScriptText(sec.h2Title, scriptKey);
                          const isSelected = sec.id === selectedSection?.id;

                          return (
                            <div key={sec.id} className="space-y-0.5">
                              <button
                                onClick={() => {
                                  setSelectedH1Title(group.h1Title);
                                  setSelectedSectionId(sec.id);
                                  setShowToc(false);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={cn(
                                  "w-full text-left py-2 px-3 rounded-xl transition-colors group flex items-center justify-between text-sm",
                                  isSelected
                                    ? "font-bold bg-amber-500/10 text-[var(--accent)]"
                                    : "text-[var(--text-primary)] hover:bg-[var(--bg-card-alt)]"
                                )}
                              >
                                <span className="leading-snug line-clamp-1">{displayH2}</span>
                              </button>

                              {/* Render H3 items for each section */}
                              {sec.h3Items.length > 0 && (
                                <div className="pl-3 space-y-0.5 border-l-2 border-[var(--border-subtle)] ml-3 my-1">
                                  {sec.h3Items.map((h3, hIdx) => (
                                    <button
                                      key={hIdx}
                                      onClick={() => {
                                        setSelectedH1Title(group.h1Title);
                                        setSelectedSectionId(sec.id);
                                        setShowToc(false);
                                        if (h3.id) {
                                          scrollToId(h3.id);
                                        } else {
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                      }}
                                      className="w-full text-left py-1.5 px-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card-alt)] transition-colors flex items-center gap-1.5"
                                    >
                                      <ChevronRight size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                                      <span className="line-clamp-1">
                                        {h3.i18nKey
                                          ? tFor(SCRIPT_TO_LANG[scriptKey] || language, h3.i18nKey)
                                          : convertScriptText(h3.title, scriptKey)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

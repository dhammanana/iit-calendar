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
  FileText
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
  const regex = /<h3([^>]*?id="([^"]*?)")?[^>]*?>([\s\S]*?)<\/h3>/gi;
  let match;
  while ((match = regex.exec(htmlSnippet)) !== null) {
    const id = match[2] || '';
    const title = match[3].replace(/<[^>]+>/g, '').trim();
    items.push({ id, title });
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

export function BookScreen({ settings }: { settings: Settings }) {
  const { t } = useI18n();

  // Multi-level navigation state:
  // Level 0: selectedBookId == null => Bookshelf Grid
  // Level 1: selectedBookId != null & selectedH1Title == null & selectedSectionId == null => H1 Volumes List Page
  // Level 2: selectedBookId != null & selectedH1Title != null & selectedSectionId == null => H2 Sections List Page
  // Level 3: selectedBookId != null & selectedSectionId != null => Section Reader Page
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedH1Title, setSelectedH1Title] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [showToc, setShowToc] = useState(false);
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

  const scrollToId = (id: string) => {
    setShowToc(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      const container = document.getElementById('tab-book');
      if (el) {
        if (container) {
          const topPos = el.getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top - 20;
          container.scrollTo({ top: topPos, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 150);
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

  const scriptKey = getScriptKey(settings.paliScript);

  const processedSectionHtml = useMemo(() => {
    if (!selectedSection) return '';
    let html = selectedSection.html;

    if (scriptKey !== Script.RO) {
      const parts = html.split(/(<[^>]+>)/g);
      html = parts.map((part, index) => {
        if (index % 2 === 0 && part.trim()) {
          if (part.length === 1 && /[\s,.;:!?]/.test(part)) return part;

          try {
            const sinhala = TextProcessor.convertFrom(part, Script.RO);
            return TextProcessor.convert(sinhala, scriptKey);
          } catch (e) {
            return part;
          }
        }
        return part;
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
  }, [selectedSection, scriptKey, searchTerm]);

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
    <div className="min-h-screen bg-[var(--bg-main)] text-slate-800 dark:text-slate-100 pb-6 selection:bg-amber-500/20">

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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">
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

        {/* ── PERMANENT BOTTOM CONTROL BAR (Fixed flush above bottom navbar when book is open) ── */}
        {selectedBook && (
          <div
            className="fixed left-0 right-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-4 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between gap-3"
            style={{
              bottom: 'calc(4.55rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
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

            {/* Search Input Bar (Spans full remaining width) */}
            <div className="relative flex-1 min-w-0">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                type="text"
                placeholder={`${t('common.search')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Table of Contents Button */}
            <button
              onClick={() => setShowToc(true)}
              title="Table of Contents"
              className="btn-icon flex-shrink-0"
            >
              <List size={18} />
            </button>
          </div>
        )}

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

                // Search filtering for H1 list
                if (searchTerm.trim()) {
                  const searchLower = searchTerm.toLowerCase();
                  const h1Match = group.h1Title.toLowerCase().includes(searchLower);
                  const hasMatchingSec = group.sections.some(s =>
                    s.h2Title.toLowerCase().includes(searchLower) || s.html.toLowerCase().includes(searchLower)
                  );
                  if (!h1Match && !hasMatchingSec) return null;
                }

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

                // Search filtering for H2 sections
                if (searchTerm.trim()) {
                  const searchLower = searchTerm.toLowerCase();
                  const titleMatch = sec.h2Title.toLowerCase().includes(searchLower);
                  const h3Match = sec.h3Items.some(h3 => h3.title.toLowerCase().includes(searchLower));
                  const contentMatch = sec.html.toLowerCase().includes(searchLower);
                  if (!titleMatch && !h3Match && !contentMatch) return null;
                }

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
                font-style: italic;
                margin-top: 2rem !important;
                margin-bottom: 0.75rem !important;
              }
              .book-container p {
                margin-bottom: 1rem !important;
                font-size: 1.1rem;
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

                <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-12 scrollbar-hide">
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
                                      <span className="line-clamp-1">{convertScriptText(h3.title, scriptKey)}</span>
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

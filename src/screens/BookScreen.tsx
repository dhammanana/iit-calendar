import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../hooks/useI18n';
import { Settings } from '../types';
import { BookItem, SearchResultItem } from '../types/book';
import {
  booksList,
  getBookHtml,
  getScriptKey,
  convertScriptText,
  parseBookSections,
  parseBookSearchIndex,
  getSearchResults,
  getBookTitle
} from '../lib/bookUtils';
import { BookshelfGrid } from '../components/books/BookshelfGrid';
import { BookVolumeList } from '../components/books/BookVolumeList';
import { BookSectionList } from '../components/books/BookSectionList';
import { BookSectionReader } from '../components/books/BookSectionReader';
import { BookControlBar } from '../components/books/BookControlBar';
import { BookSearchSheet } from '../components/books/BookSearchSheet';
import { BookTocSheet } from '../components/books/BookTocSheet';

export type { BookItem, SearchResultItem };

export function BookScreen({ settings, isActive = true }: { settings: Settings; isActive?: boolean }) {
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

  const contentRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to top whenever navigation state changes
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

  useEffect(() => {
    if (showToc && selectedSectionId && tocRef.current) {
      setTimeout(() => {
        const activeElement = tocRef.current?.querySelector(`[data-section-id="${selectedSectionId}"]`);
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [showToc, selectedSectionId]);

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
  }, [searchTerm, selectedSection]);

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


  return (
    <div className="flex flex-col min-h-full relative bg-[var(--bg-main)] text-slate-800 dark:text-slate-100 selection:bg-amber-500/20">

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
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex-1 flex flex-col gap-4">

        {/* Header & Interactive Breadcrumbs */}
        <div className="px-2 text-center relative flex flex-col items-center">
          <h1 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none mb-1.5">
            {t('common.books') || t('common.book') || 'Books'}
          </h1>
          {!selectedBook ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
              Dhamma texts and chanting books
            </p>
          ) : (
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
                {getBookTitle(selectedBook, t)}
              </button>

              {selectedH1Title && selectedH1Title !== 'General' && parsedBook.h1Groups.length > 1 && (
                <>
                  <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                  <button
                    onClick={() => setSelectedSectionId(null)}
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

        {/* Main Content Views */}
        {!selectedBook ? (
          /* Level 0: Bookshelf Catalog Grid */
          <BookshelfGrid
            books={booksList}
            onSelectBook={(bookId) => {
              setSelectedBookId(bookId);
              setSelectedH1Title(null);
              setSelectedSectionId(null);
              setSearchTerm('');
            }}
            t={t}
          />
        ) : selectedH1Title === null && parsedBook.h1Groups.length > 1 ? (
          /* Level 1: H1 Volumes List Page */
          <BookVolumeList
            h1Groups={parsedBook.h1Groups}
            scriptKey={scriptKey}
            onSelectH1={(h1Title) => setSelectedH1Title(h1Title)}
          />
        ) : !selectedSection ? (
          /* Level 2: H2 Sections List Page */
          <BookSectionList
            selectedH1Group={selectedH1Group}
            allSections={parsedBook.allSections}
            scriptKey={scriptKey}
            onSelectSection={(sectionId) => setSelectedSectionId(sectionId)}
          />
        ) : (
          /* Level 3: Section Reader View */
          <BookSectionReader
            selectedSection={selectedSection}
            scriptKey={scriptKey}
            searchTerm={searchTerm}
            language={language}
            t={t}
            tFor={tFor}
            contentRef={contentRef}
          />
        )}
      </div>

      {/* Permanent Bottom Control Bar */}
      <BookControlBar
        isActive={isActive}
        selectedBook={selectedBook}
        selectedSectionId={selectedSectionId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setIsSearchFocused={setIsSearchFocused}
        onNavigateMatch={navigateMatch}
        onCatalog={() => {
          setSelectedBookId(null);
          setSelectedH1Title(null);
          setSelectedSectionId(null);
          setSearchTerm('');
        }}
        onToggleToc={() => setShowToc(true)}
        currentSectionIndex={currentSectionIndex}
        totalSections={parsedBook.allSections.length}
        onPrevSection={goToPrevSection}
        onNextSection={goToNextSection}
        t={t}
      />

      {/* Live Search Bottom Sheet Modal */}
      <BookSearchSheet
        isOpen={isSearchFocused}
        onClose={() => setIsSearchFocused(false)}
        selectedBook={selectedBook}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={searchResults}
        scriptKey={scriptKey}
        booksList={booksList}
        onSelectSearchResult={handleSelectSearchResult}
        t={t}
      />

      {/* Table of Contents Bottom Sheet Modal */}
      <BookTocSheet
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        selectedBook={selectedBook}
        parsedBook={parsedBook}
        selectedSectionId={selectedSectionId}
        scriptKey={scriptKey}
        language={language}
        tocRef={tocRef}
        onSelectH1={(h1Title) => {
          setSelectedH1Title(h1Title);
          setSelectedSectionId(null);
          setShowToc(false);
        }}
        onSelectSection={(h1Title, sectionId) => {
          setSelectedH1Title(h1Title);
          setSelectedSectionId(sectionId);
          setShowToc(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectH3={(h1Title, sectionId, h3Id) => {
          setSelectedH1Title(h1Title);
          setSelectedSectionId(sectionId);
          setShowToc(false);
          if (h3Id) {
            scrollToId(h3Id);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        t={t}
        tFor={tFor}
      />
    </div>
  );
}

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
import { PaliText } from '../components/PaliText';

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
      <div className="w-full safe-header bg-gradient-to-b from-[#f8f2e4] via-[#ede0c0] to-[#ddc898] dark:from-[#261808] dark:via-[#191005] dark:to-[#0d0905] overflow-hidden sticky top-0 z-10 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="absolute w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] md:w-[220px] md:h-[220px] lg:w-[240px] lg:h-[240px] -translate-y-3 text-saffron dark:text-amber-500 transition-all duration-700 hover:scale-105 filter drop-shadow-md"
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

          {/* Scripture vector icon inside the pill matching amber theme */}
          <g transform="translate(36, 64) scale(0.002734375, -0.002734375)" fill="currentColor" className="text-amber-800 dark:text-amber-300">
            <path d="M4826 6879 c-15 -12 -32 -33 -37 -47 l-10 -25 -462 7 c-254 4 -682
11 -952 16 -269 5 -805 10 -1191 10 -788 0 -773 1 -837 -69 -65 -72 -81 -159
-98 -524 l-11 -248 -33 -49 c-35 -52 -55 -122 -55 -193 0 -23 -7 -82 -15 -132
-43 -267 -50 -390 -49 -805 1 -324 5 -418 17 -470 8 -36 18 -108 22 -160 13
-171 63 -254 173 -286 52 -16 105 -16 662 -5 872 16 1673 29 2317 36 l561 7 7
-31 c15 -71 93 -123 150 -101 15 6 30 9 32 6 6 -6 -23 -112 -84 -306 -71 -227
-91 -312 -101 -440 -12 -141 -2 -238 28 -262 28 -23 122 -51 143 -42 20 7 24
20 32 109 15 169 92 605 107 605 5 0 8 -8 8 -17 0 -10 7 -74 15 -143 16 -134
24 -150 74 -150 36 0 127 44 134 65 13 32 -15 212 -62 400 -27 105 -48 191
-47 192 1 1 21 -5 45 -13 32 -11 51 -12 80 -4 45 12 66 33 83 84 l13 38 245
-1 c554 -3 2086 -59 2873 -106 262 -16 322 -11 393 31 92 53 116 110 138 324
50 473 48 1126 -4 1550 -23 188 -32 228 -65 287 -20 36 -23 60 -29 210 -11
270 -26 444 -42 495 -18 54 -64 100 -121 119 -30 10 -184 11 -725 6 -749 -7
-725 -5 -782 -66 -41 -43 -86 -42 -178 7 l-72 37 -130 0 c-72 0 -451 -4 -842
-9 l-712 -9 -16 31 c-31 60 -102 78 -169 42 -37 -20 -37 -20 -69 0 -44 27
-107 26 -142 -1 l-26 -21 -34 21 c-45 28 -114 28 -150 0z m123 -76 c20 -16 24
-38 41 -223 15 -162 49 -598 83 -1052 2 -32 -1 -38 -22 -43 -13 -3 -27 -2 -31
2 -5 4 -24 145 -44 313 -20 168 -55 458 -78 645 -23 187 -39 348 -35 358 8 23
58 22 86 0z m205 -16 c20 -27 20 -29 7 -460 -7 -237 -16 -452 -20 -477 -7 -34
-9 -38 -10 -16 -3 71 -53 683 -66 806 -13 120 -12 137 1 158 20 31 60 26 88
-11z m187 16 c19 -22 16 -336 -5 -588 -32 -373 -68 -710 -78 -722 -6 -7 -22
-13 -35 -13 -25 0 -25 1 -19 63 21 215 46 778 46 1039 l0 197 26 20 c32 25 47
26 65 4z m3528 -48 c32 -16 57 -69 63 -130 l3 -40 -365 -8 c-607 -12 -843 -21
-847 -32 -11 -35 -2 -36 610 -24 328 7 599 10 601 8 2 -2 6 -29 10 -60 l6 -57
-171 -4 c-135 -3 -172 -6 -179 -18 -18 -29 10 -34 174 -31 92 1 166 -2 170 -7
3 -5 8 -63 12 -129 l7 -121 -54 14 c-45 12 -337 14 -1777 14 l-1724 0 6 63
c10 104 26 377 26 460 l0 77 363 0 c199 0 568 5 819 11 l457 10 82 -40 c67
-33 93 -41 138 -41 60 0 87 13 128 60 l21 25 224 5 c122 3 436 7 696 8 398 2
477 0 501 -13z m-4764 -16 c369 -6 672 -14 675 -16 5 -5 78 -586 74 -594 -2
-3 -351 -9 -776 -12 -1492 -13 -2649 -38 -2721 -58 -22 -6 -41 -8 -43 -6 -3 2
-2 66 2 141 l7 136 139 0 c118 0 140 2 145 16 10 27 -18 34 -152 34 l-130 0 5
74 c3 41 9 78 13 83 5 4 261 9 570 9 542 1 562 2 562 20 0 17 -12 20 -110 27
-60 4 -314 7 -562 5 -451 -3 -453 -3 -453 17 0 39 44 109 80 128 33 18 81 18
1020 14 542 -3 1287 -11 1655 -18z m758 -696 c3 -5 19 -135 38 -291 l33 -283
-47 -40 c-52 -45 -71 -91 -57 -140 7 -23 5 -37 -10 -62 -31 -50 -27 -112 9
-148 17 -17 40 -29 55 -29 32 0 32 8 3 -250 l-22 -195 -475 3 c-352 2 -476 5
-479 14 -9 28 -52 58 -81 58 -37 0 -65 -13 -102 -48 l-27 -25 -678 12 c-717
12 -1579 37 -1651 47 -51 7 -114 58 -131 106 l-11 31 73 -6 c39 -4 131 -12
202 -18 72 -7 292 -13 490 -13 354 -1 360 -1 360 19 0 20 -9 20 -365 26 -312
6 -672 27 -746 44 -21 5 -22 13 -29 148 -8 168 -3 742 7 752 10 10 399 43 626
53 106 5 195 12 198 15 4 3 4 13 1 22 -5 12 -27 15 -120 15 -107 0 -593 -33
-664 -45 -29 -5 -33 -3 -33 16 0 39 48 108 91 129 22 12 76 25 122 30 116 13
1956 45 3097 53 157 1 293 3 302 5 9 1 19 -1 21 -5z m4072 -18 c22 -11 49 -35
61 -52 21 -31 40 -100 31 -110 -3 -2 -200 1 -439 7 -461 13 -1954 14 -2478 2
l-315 -7 -3 -24 -4 -24 424 8 c615 11 1874 8 2383 -5 242 -6 441 -13 442 -14
2 -1 11 -63 20 -137 13 -100 17 -213 18 -451 0 -174 -3 -320 -7 -323 -22 -22
-264 -37 -623 -39 -367 -3 -380 -3 -380 -22 0 -16 11 -20 80 -27 110 -11 676
1 805 17 58 7 107 12 108 10 9 -6 -22 -81 -42 -102 -44 -49 -69 -55 -281 -63
-632 -25 -2306 -59 -2936 -59 l-405 0 -27 178 c-15 97 -27 182 -27 187 0 6 14
16 31 24 21 9 38 28 50 56 10 23 29 47 43 53 64 29 77 117 28 186 -26 37 -29
47 -25 101 4 50 2 64 -17 87 -11 15 -39 33 -61 39 -39 12 -40 13 -34 53 8 61
45 432 45 456 l0 20 1748 -2 c1724 -3 1748 -3 1787 -23z m-3557 -587 c35 -35
-9 -95 -80 -109 -24 -4 -90 -5 -148 -2 -76 4 -123 1 -170 -10 -70 -17 -88 -10
-68 26 21 40 84 57 223 57 118 1 134 3 175 25 53 28 53 28 68 13z m65 -219 c3
-11 -2 -26 -10 -35 -14 -14 -20 -12 -54 22 -22 21 -39 41 -39 45 0 4 12 12 28
17 22 8 31 6 49 -10 11 -11 23 -28 26 -39z m-353 21 c0 -12 -70 -64 -122 -91
-43 -22 -84 -25 -91 -6 -17 50 61 92 201 106 6 0 12 -3 12 -9z m203 -65 c55
-44 65 -63 51 -99 -15 -39 -92 -1 -146 71 -32 43 -34 50 -12 74 19 22 25 19
107 -46z m-252 -264 c-17 -254 -30 -503 -36 -746 -4 -121 -11 -232 -17 -247
-13 -35 -42 -36 -64 -2 -15 22 -16 46 -11 202 8 215 59 789 82 928 5 31 46 62
54 41 2 -5 -2 -84 -8 -176z m185 101 c28 -24 33 -37 44 -107 107 -737 130
-905 130 -942 0 -58 -27 -87 -67 -72 -44 16 -53 29 -53 71 0 21 -20 242 -45
491 -60 610 -58 587 -49 587 5 0 23 -13 40 -28z m-70 -573 c19 -189 36 -384
37 -432 2 -81 0 -90 -20 -107 -28 -22 -59 -16 -80 17 -15 22 -15 55 -4 341 14
374 23 534 28 528 2 -2 20 -159 39 -347z m-3928 209 c55 -59 96 -65 473 -77
441 -14 1071 -28 1604 -37 l420 -7 43 37 c24 20 47 36 50 36 3 0 20 -15 37
-34 l30 -34 488 -7 487 -7 -6 -67 c-4 -36 -10 -70 -14 -74 -10 -11 -2333 19
-3222 42 -298 8 -309 9 -355 32 -66 34 -92 86 -99 205 l-6 89 22 -35 c12 -19
34 -47 48 -62z m7787 -55 c-12 -65 -42 -111 -87 -134 -36 -19 -68 -23 -233
-30 -104 -4 -278 -9 -385 -11 l-195 -3 -95 33 c-52 19 -117 36 -145 39 -45 5
-58 1 -140 -42 l-90 -48 -455 -7 c-250 -5 -748 -11 -1106 -15 l-651 -7 -6 24
c-4 13 -9 50 -13 81 l-7 57 399 0 c549 0 1791 24 2886 56 218 7 236 9 327 43
2 0 0 -16 -4 -36z m-7675 -243 c108 -12 1402 -36 2983 -56 l517 -6 0 -42 c0
-22 -4 -47 -9 -55 -8 -12 -160 -13 -1063 -8 -1023 7 -1926 21 -2293 36 -143 5
-188 11 -218 25 -43 21 -82 80 -90 138 l-5 36 47 -29 c36 -23 66 -31 131 -39z
m6663 23 l112 -38 185 3 c102 2 279 7 393 12 194 8 212 10 260 34 28 14 53 24
55 22 6 -6 -28 -79 -46 -99 -40 -45 -67 -50 -312 -58 -730 -25 -2408 -59
-2916 -59 l-281 0 -7 47 c-3 25 -5 47 -4 48 2 1 491 8 1088 14 597 7 1099 14
1115 18 28 5 73 27 155 73 48 28 74 25 203 -17z m1050 -198 c-8 -71 -16 -132
-19 -135 -15 -14 -574 -1 -809 19 -318 27 -335 27 -335 1 0 -25 2 -25 245 -44
367 -29 559 -38 722 -34 149 3 161 2 152 -13 -13 -26 -71 -58 -120 -67 -24 -5
-107 -5 -184 -1 -714 40 -1796 84 -2440 99 -258 6 -543 13 -632 16 l-163 6 0
42 0 43 653 7 c819 8 1931 33 2544 56 266 10 293 17 359 93 21 25 40 44 40 44
1 -1 -5 -60 -13 -132z m-7783 -20 c62 -23 1829 -54 3083 -55 l477 0 0 -40 0
-40 -127 0 c-276 -1 -1583 -20 -2429 -36 -490 -9 -912 -14 -937 -10 -25 4 -58
17 -73 28 -34 27 -63 92 -64 142 0 33 3 37 18 31 9 -4 33 -13 52 -20z m3853
-361 c-1 -5 -26 -124 -57 -264 -61 -284 -81 -392 -102 -559 -7 -63 -15 -116
-17 -117 -2 -2 -12 2 -22 9 -15 12 -18 29 -17 123 0 140 24 254 106 509 35
110 69 226 76 258 8 33 18 56 24 54 6 -3 10 -8 9 -13z m121 -214 c33 -136 59
-296 49 -312 -2 -5 -12 -8 -22 -8 -16 0 -20 11 -25 68 -9 90 -43 284 -56 317
-11 29 -3 102 10 88 4 -4 24 -73 44 -153z"/>
<path d="M6090 6563 c0 -10 5 -56 10 -103 5 -47 6 -117 2 -158 -7 -58 -5 -75
6 -84 11 -10 17 -8 29 7 12 16 14 47 10 170 -5 163 -10 185 -38 185 -11 0 -19
-7 -19 -17z"/>
<path d="M6394 6408 c1 -126 2 -133 21 -133 19 0 20 8 23 110 3 128 -1 155
-27 155 -17 0 -18 -10 -17 -132z"/>
<path d="M6736 6498 c-8 -30 -8 -212 0 -232 3 -9 15 -16 25 -16 18 0 19 9 19
135 0 126 -1 135 -19 135 -11 0 -21 -9 -25 -22z"/>
<path d="M6857 6474 c-4 -4 -7 -49 -7 -99 0 -71 4 -96 15 -105 28 -23 36 3 33
106 -2 80 -6 99 -18 102 -9 1 -19 0 -23 -4z"/>
<path d="M7023 6433 c-18 -7 -17 -109 1 -116 22 -9 36 14 36 59 0 42 -15 65
-37 57z"/>
<path d="M3734 6588 c-11 -17 -18 -285 -10 -342 6 -36 11 -46 27 -46 18 0 19
9 21 175 1 96 2 185 2 197 1 25 -27 37 -40 16z"/>
<path d="M2670 6580 c-19 -12 -21 -333 -2 -351 24 -25 30 7 34 178 5 175 2
194 -32 173z"/>
<path d="M2834 6567 c-2 -7 -3 -85 -2 -172 3 -152 4 -160 23 -160 19 0 20 8
23 173 2 168 2 172 -18 172 -11 0 -23 -6 -26 -13z"/>
<path d="M3875 6528 c-3 -29 -5 -87 -3 -128 3 -67 5 -75 23 -75 19 0 20 7 22
105 2 58 4 114 5 125 2 14 -4 21 -19 23 -19 3 -22 -3 -28 -50z"/>
<path d="M2975 6478 c-3 -13 -5 -55 -3 -93 3 -62 5 -70 23 -70 19 0 20 7 20
90 0 77 -2 90 -17 93 -11 2 -19 -5 -23 -20z"/>
<path d="M4256 6465 c-3 -9 -6 -40 -6 -70 0 -56 15 -80 44 -69 14 5 16 19 14
78 -3 64 -5 71 -24 74 -13 2 -24 -4 -28 -13z"/>
<path d="M2230 5831 c0 -26 14 -29 155 -33 115 -3 120 -2 123 18 3 20 -3 21
-89 27 -160 12 -189 10 -189 -12z"/>
<path d="M4286 5692 c-10 -16 -17 -857 -8 -871 6 -8 16 -11 24 -8 12 4 16 75
21 437 4 237 5 436 1 441 -6 11 -31 12 -38 1z"/>
<path d="M4121 5634 c-28 -36 -27 -79 4 -110 14 -14 25 -28 25 -32 -1 -4 -18
-19 -39 -33 -58 -41 -59 -65 -4 -116 l46 -43 -40 -35 c-60 -51 -61 -71 -7
-123 l45 -43 -39 -38 c-45 -44 -56 -82 -37 -128 14 -34 67 -73 98 -73 30 0 19
37 -17 58 -52 31 -52 55 0 113 56 64 57 87 2 133 l-43 36 43 36 c30 26 42 43
42 62 0 33 -6 42 -47 71 -18 12 -33 26 -33 31 0 5 16 18 36 30 20 13 39 32 44
44 9 24 -11 70 -35 79 -18 7 -19 30 -3 56 12 19 5 51 -11 51 -5 0 -19 -12 -30
-26z"/>
<path d="M2955 5588 c-11 -45 -1 -656 12 -669 30 -30 33 4 33 347 0 336 0 344
-20 344 -12 0 -22 -9 -25 -22z"/>
<path d="M4423 5603 c-21 -8 -16 -61 7 -73 27 -15 60 4 60 33 0 38 -29 56 -67
40z"/>
<path d="M3625 5580 c-4 -6 -4 -66 -1 -133 24 -444 28 -502 42 -517 32 -33 36
1 24 206 -6 110 -14 255 -18 324 -6 105 -10 125 -24 128 -9 2 -19 -2 -23 -8z"/>
<path d="M2787 5403 c-4 -3 -7 -72 -7 -153 0 -107 4 -151 13 -165 30 -40 37
-8 33 153 -2 86 -5 160 -5 165 -1 9 -25 9 -34 0z"/>
<path d="M4420 5395 c-7 -8 -10 -25 -6 -40 5 -20 13 -25 36 -25 38 0 55 28 34
58 -18 25 -46 28 -64 7z"/>
<path d="M3473 5338 c-6 -7 -13 -36 -17 -63 -7 -58 8 -90 40 -83 16 3 19 13
22 66 4 77 -18 114 -45 80z"/>
<path d="M2627 5303 c-2 -4 -1 -42 2 -83 5 -60 9 -75 23 -78 24 -5 30 29 21
103 -6 44 -13 61 -25 63 -9 2 -18 -1 -21 -5z"/>
<path d="M4411 5181 c-16 -29 -14 -39 13 -56 36 -24 68 -5 64 38 -3 28 -7 32
-35 35 -23 2 -34 -2 -42 -17z"/>
<path d="M4410 4981 c-14 -27 -13 -37 6 -55 40 -40 101 3 75 53 -15 28 -66 29
-81 2z"/>
<path d="M5917 5674 c-12 -12 5 -878 17 -886 6 -4 16 -2 23 4 14 11 16 315 4
688 -5 165 -8 195 -21 198 -9 1 -19 0 -23 -4z"/>
<path d="M6073 5614 c-3 -8 -1 -20 6 -27 18 -18 13 -42 -14 -67 -39 -36 -34
-74 15 -108 21 -15 39 -32 40 -39 0 -6 -15 -21 -34 -32 -60 -37 -62 -76 -6
-124 22 -19 40 -39 40 -45 0 -6 -15 -20 -34 -31 -60 -38 -61 -64 -1 -131 25
-28 45 -56 45 -63 0 -18 -19 -40 -52 -60 -36 -22 -37 -47 -2 -47 58 0 113 74
99 133 -4 14 -26 44 -48 67 -38 37 -40 42 -24 51 83 47 91 95 26 152 -42 36
-43 38 -24 49 11 7 33 24 48 40 41 40 29 70 -44 119 l-24 17 28 29 c17 18 27
40 27 59 0 54 -51 99 -67 58z"/>
<path d="M5768 5579 c-22 -12 -23 -52 -3 -69 8 -7 25 -10 39 -6 33 8 43 42 20
67 -19 21 -31 23 -56 8z"/>
<path d="M7375 5578 c-3 -7 -4 -164 -3 -348 3 -327 3 -335 23 -335 20 0 20 7
20 345 0 321 -1 345 -18 348 -9 2 -19 -3 -22 -10z"/>
<path d="M6552 5561 c-11 -7 -12 -36 -1 -167 7 -95 9 -226 6 -326 -7 -172 -2
-197 31 -165 13 13 15 50 16 229 1 327 -14 453 -52 429z"/>
<path d="M7196 5493 c-3 -21 -6 -80 -6 -131 0 -76 3 -94 16 -99 27 -10 34 17
34 145 0 113 -1 122 -19 122 -14 0 -20 -10 -25 -37z"/>
<path d="M7522 5463 c-9 -23 -8 -370 1 -406 5 -19 13 -27 25 -25 15 3 17 22
15 216 -1 116 -5 216 -8 222 -10 15 -25 12 -33 -7z"/>
<path d="M6717 5413 c-10 -10 -8 -316 2 -332 5 -8 16 -11 25 -8 14 6 16 29 16
165 0 109 -4 162 -12 170 -14 14 -22 15 -31 5z"/>
<path d="M5772 5379 c-18 -7 -23 -15 -20 -35 7 -56 69 -57 76 -1 4 32 -23 49
-56 36z"/>
<path d="M7030 5308 c-31 -11 -40 -25 -40 -64 0 -65 82 -87 123 -32 17 23 18
31 8 57 -15 35 -55 52 -91 39z m41 -71 c-5 -5 -17 -7 -26 -3 -14 5 -15 9 -5
21 10 12 16 13 27 4 9 -8 10 -16 4 -22z"/>
<path d="M7706 5312 c-9 -15 2 -144 14 -156 20 -20 31 11 28 85 -2 59 -6 74
-20 77 -9 2 -19 -1 -22 -6z"/>
<path d="M5768 5169 c-36 -21 -16 -79 27 -79 42 0 59 44 29 74 -18 18 -32 20
-56 5z"/>
<path d="M7176 5072 c-8 -13 5 -112 16 -118 6 -4 16 0 24 8 20 20 6 111 -18
116 -9 2 -19 -1 -22 -6z"/>
<path d="M5755 4956 c-30 -45 20 -91 64 -59 26 18 27 45 3 66 -26 24 -49 21
-67 -7z"/>
          </g>
        </svg>
      </div>

      {/* Card Overlay container */}
      <div className="relative z-20 mt-[-2.5rem] bg-[var(--bg-main)] rounded-t-[3rem] px-4 pt-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex-1 flex flex-col gap-4">

        {/* Header & Interactive Breadcrumbs */}
        <div className="px-2 text-center relative flex flex-col items-center">
          <h1 className="font-serif text-3xl font-bold text-[var(--text-primary)] leading-none mb-1.5">
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
                    <PaliText text={selectedH1Title} script={settings.paliScript} />
                  </button>
                </>
              )}

              {selectedSection && (
                <>
                  <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-[var(--accent)] font-bold line-clamp-1">
                    <PaliText text={selectedSection.h2Title} script={settings.paliScript} />
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

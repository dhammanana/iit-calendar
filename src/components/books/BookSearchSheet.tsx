import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BookItem, SearchResultItem } from '../../types/book';
import { TextProcessor, Script, buildDiacriticRegex } from '../../lib/pali-script';
import { convertScriptText, getBookTitle } from '../../lib/bookUtils';

interface BookSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBook: BookItem | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: { item: SearchResultItem; matchSnippet?: string }[];
  scriptKey: string;
  booksList: BookItem[];
  onSelectSearchResult: (item: SearchResultItem) => void;
  t: (key: any) => string;
}

function renderSnippetWithHighlight(snippet: string, query: string, scriptKey: string) {
  if (!query || !snippet) return snippet;

  let searchPattern = query.trim();
  if (scriptKey !== Script.RO && /^[a-zA-Zāīūṃṅñṭḍṇḷḥ\s,.'"-]+$/i.test(query)) {
    try {
      const baseScriptText = TextProcessor.convertFrom(query, Script.RO);
      searchPattern = TextProcessor.convert(baseScriptText, scriptKey);
    } catch {
      // fallback
    }
  }

  try {
    const regex = buildDiacriticRegex(searchPattern, 'gi', true);
    const parts = snippet.split(regex);

    if (parts.length > 1) {
      return (
        <span>
          {parts.map((part, i) =>
            i % 2 === 1 ? (
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
  } catch {
    // fallback
  }

  const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = snippet.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
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

export function BookSearchSheet({
  isOpen,
  onClose,
  selectedBook,
  searchTerm,
  setSearchTerm,
  searchResults,
  scriptKey,
  booksList,
  onSelectSearchResult,
  t
}: BookSearchSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/75"
          />
          {/* Slide-Up Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] h-[75vh] bg-[var(--bg-card)] z-[60] shadow-2xl border-t border-[var(--border-subtle)] flex flex-col rounded-t-[2.5rem] overflow-hidden will-change-transform transform-gpu"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
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
                      ? `Searching in ${getBookTitle(selectedBook, t)}`
                      : 'Searching across all books'}
                    {searchTerm.trim().length >= 2 && ` • ${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} found`}
                  </p>
                </div>
                <button
                  onClick={onClose}
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
                    booksList.find(b => b.id === item.bookId) || selectedBook!,
                    t
                  );

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectSearchResult(item)}
                      className="glass-card p-3.5 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--accent)] cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.98] flex flex-col gap-2 group"
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
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

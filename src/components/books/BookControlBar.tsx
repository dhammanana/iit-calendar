import React from 'react';
import { BookOpen, Search, ChevronUp, ChevronDown, X, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BookItem } from '../../types/book';

interface BookControlBarProps {
  selectedBook: BookItem | null;
  selectedSectionId: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setIsSearchFocused: (focused: boolean) => void;
  onNavigateMatch: (direction: 'next' | 'prev') => void;
  onCatalog: () => void;
  onToggleToc: () => void;
  currentSectionIndex?: number;
  totalSections?: number;
  onPrevSection?: () => void;
  onNextSection?: () => void;
  t: (key: any) => string;
}

export function BookControlBar({
  selectedBook,
  selectedSectionId,
  searchTerm,
  setSearchTerm,
  setIsSearchFocused,
  onNavigateMatch,
  onCatalog,
  onToggleToc,
  currentSectionIndex,
  totalSections,
  onPrevSection,
  onNextSection,
  t
}: BookControlBarProps) {
  const showPagination =
    selectedBook &&
    selectedSectionId !== null &&
    currentSectionIndex !== undefined &&
    currentSectionIndex >= 0 &&
    totalSections !== undefined &&
    totalSections > 0;

  const hasNext = showPagination && currentSectionIndex < totalSections - 1;

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-3 sm:px-6 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.25)] flex items-center justify-between gap-2 sm:gap-3"
      style={{
        bottom: 'calc(4.55rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {selectedBook && (
        /* Book Catalog Button */
        <button
          onClick={onCatalog}
          title="Book Catalog"
          className="btn-icon flex-shrink-0"
        >
          <BookOpen size={18} />
        </button>
      )}

      {/* Search Input Bar */}
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
                  onClick={() => onNavigateMatch('prev')}
                  className="p-1 hover:bg-[var(--bg-card-alt)] rounded-full text-[var(--text-muted)] transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => onNavigateMatch('next')}
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

      {/* Right Controls: Table of Contents & Section Pagination */}
      {selectedBook && (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onToggleToc}
            title="Table of Contents"
            className="btn-icon flex-shrink-0"
          >
            <List size={18} />
          </button>

          {showPagination && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <button
                onClick={onPrevSection}
                disabled={currentSectionIndex <= 0}
                title="Previous Section"
                className="btn-icon flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] flex-shrink-0 whitespace-nowrap px-0.5 select-none">
                {currentSectionIndex + 1} of {totalSections}
              </span>

              <button
                onClick={onNextSection}
                disabled={!hasNext}
                title="Next Section"
                className={cn(
                  "btn-icon flex-shrink-0 transition-all",
                  hasNext
                    ? "bg-[var(--accent)] text-white border-transparent shadow-sm hover:opacity-90"
                    : "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

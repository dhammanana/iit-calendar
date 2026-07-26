import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BookItem, ParsedBook } from '../../types/book';
import { convertScriptText, getBookTitle, SCRIPT_TO_LANG } from '../../lib/bookUtils';

interface BookTocSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBook: BookItem | null;
  parsedBook: ParsedBook;
  selectedSectionId: string | null;
  scriptKey: string;
  language: string;
  tocRef: React.RefObject<HTMLDivElement | null>;
  onSelectH1: (h1Title: string) => void;
  onSelectSection: (h1Title: string, sectionId: string) => void;
  onSelectH3: (h1Title: string, sectionId: string, h3Id?: string) => void;
  t: (key: any) => string;
  tFor: (lang: string, key: string) => string;
}

export function BookTocSheet({
  isOpen,
  onClose,
  selectedBook,
  parsedBook,
  selectedSectionId,
  scriptKey,
  language,
  tocRef,
  onSelectH1,
  onSelectSection,
  onSelectH3,
  t,
  tFor
}: BookTocSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && selectedBook && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 opacity-80" />
            </div>

            <div className="flex justify-between items-center px-6 pb-4 pt-1 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">Table of Contents</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{getBookTitle(selectedBook, t)}</p>
              </div>
              <button onClick={onClose} className="btn-icon"><X size={18} /></button>
            </div>

            <div ref={tocRef} className="flex-1 overflow-y-auto p-4 space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom,24px))] scrollbar-hide">
              {parsedBook.h1Groups.map((group, gIdx) => {
                const displayH1 = convertScriptText(group.h1Title, scriptKey);

                return (
                  <div key={gIdx} className="space-y-1.5">
                    {displayH1 && (
                      <button
                        onClick={() => onSelectH1(group.h1Title)}
                        className="w-full text-left font-serif font-bold text-base text-[var(--accent)] px-3 pt-3 pb-1.5 border-b-2 border-[var(--border-subtle)] flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <span>{displayH1}</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                    {group.sections.map((sec) => {
                      const displayH2 = convertScriptText(sec.h2Title, scriptKey);
                      const isSelected = sec.id === selectedSectionId;

                      return (
                        <div key={sec.id} className="space-y-0.5">
                          <button
                            onClick={() => onSelectSection(group.h1Title, sec.id)}
                            data-section-id={sec.id}
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
                                  onClick={() => onSelectH3(group.h1Title, sec.id, h3.id)}
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
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { Layers, FileText, ChevronRight } from 'lucide-react';
import { BookSection, H1Group } from '../../types/book';
import { convertScriptText } from '../../lib/bookUtils';

interface BookSectionListProps {
  selectedH1Group: H1Group | null;
  allSections: BookSection[];
  scriptKey: string;
  onSelectSection: (sectionId: string) => void;
}

export function BookSectionList({
  selectedH1Group,
  allSections,
  scriptKey,
  onSelectSection
}: BookSectionListProps) {
  const sectionsToRender = selectedH1Group ? selectedH1Group.sections : allSections;

  return (
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
        {sectionsToRender.map((sec) => {
          const displayH2 = convertScriptText(sec.h2Title, scriptKey);
          const h3Count = sec.h3Items.length;

          return (
            <motion.button
              key={sec.id}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSection(sec.id)}
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
  );
}

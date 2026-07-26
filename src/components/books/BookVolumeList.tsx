import React from 'react';
import { motion } from 'motion/react';
import { Layers, ChevronRight } from 'lucide-react';
import { H1Group } from '../../types/book';
import { convertScriptText } from '../../lib/bookUtils';

interface BookVolumeListProps {
  h1Groups: H1Group[];
  scriptKey: string;
  onSelectH1: (h1Title: string) => void;
}

export function BookVolumeList({ h1Groups, scriptKey, onSelectH1 }: BookVolumeListProps) {
  return (
    <div className="max-w-3xl w-full mx-auto px-2 sm:px-4 py-2 space-y-4">
      <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {h1Groups.length} Chapters
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {h1Groups.map((group, gIdx) => {
          const displayH1 = convertScriptText(group.h1Title, scriptKey);
          const sectionCount = group.sections.length;

          return (
            <motion.button
              key={gIdx}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectH1(group.h1Title)}
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
  );
}

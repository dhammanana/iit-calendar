import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Hash } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserChant } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { PaliText } from '../PaliText';

import { getChantTitle, isChantNamePali } from '../../services/ChantService';
import { useI18n } from '../../hooks/useI18n';

interface ChantCardProps {
  chant: UserChant;
  selected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  paliScript: string;
}

export function ChantCard({ chant, selected, onClick, onDelete, paliScript }: ChantCardProps) {
  const { t } = useI18n();
  const chantTitle = getChantTitle(chant, t);
  const lastUsedText = chant.lastUsed 
    ? formatDistanceToNow(chant.lastUsed, { addSuffix: true })
    : 'Never chanted';

  // Handle keyboard interaction for accessibility since it's now a div
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        "w-full text-left p-3.5 rounded-[1.2rem] transition-all duration-300 border bg-[var(--bg-card)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4",
        selected 
          ? "border-[var(--accent)] text-[var(--text-primary)] shadow-md shadow-[var(--accent)]/10" 
          : "border-[var(--border-subtle)] hover:border-[var(--accent)]/30"
      )}
    >
      {/* Row 1 (Narrow) / Left side (Wide): Selection Dot + Chant Title */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "p-2 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 sm:mt-0",
          selected ? "bg-[var(--accent)]" : "bg-[var(--bg-muted)]"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            selected ? "bg-[var(--bg-main)]" : "bg-[var(--text-faint)]"
          )} />
        </div>
        <h4 className={cn(
          "text-sm font-bold leading-snug flex-1 min-w-0 break-words",
          selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        )}>
          <PaliText text={chantTitle} script={paliScript} isPali={isChantNamePali(chant)} />
        </h4>
      </div>

      {/* Row 2 (Narrow, collapsed with pl-8) / Right side (Wide, sm:pl-0 inline): Last Used, Count Badge & Delete Button */}
      <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pl-8 sm:pl-0 w-full sm:w-auto">
        <div className="min-w-0">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate block">
            {lastUsedText}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
          <div 
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold flex items-center gap-1 border transition-colors",
              selected 
                ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]" 
                : "bg-[var(--bg-muted)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}
            title="Total count"
          >
            <Hash size={10} className="opacity-70 flex-shrink-0" />
            <span>{chant.totalCount.toLocaleString()}</span>
          </div>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="text-[var(--text-faint)] hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90 transition-all"
              title="Delete chant"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
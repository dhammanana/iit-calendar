import React from 'react';
import { motion } from 'motion/react';
import { Check, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserChant } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { PaliText } from '../PaliText';

interface ChantCardProps {
  chant: UserChant;
  selected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  paliScript: string;
}

export function ChantCard({ chant, selected, onClick, onDelete, paliScript }: ChantCardProps) {
  const lastUsedText = chant.lastUsed 
    ? formatDistanceToNow(chant.lastUsed, { addSuffix: true })
    : 'Never used';

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
        "w-full text-left p-3.5 rounded-[1.2rem] transition-all duration-300 border bg-[var(--bg-card)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
        selected 
          ? "border-[var(--accent)] text-[var(--text-primary)] shadow-md shadow-[var(--accent)]/10" 
          : "border-[var(--border-subtle)] hover:border-[var(--accent)]/30"
      )}
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-3 items-center min-w-0 flex-1">
          <div className={cn(
            "p-2 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
            selected ? "bg-[var(--accent)]" : "bg-[var(--bg-muted)]"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              selected ? "bg-[var(--bg-main)]" : "bg-[var(--text-faint)]"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={cn(
              "text-sm font-bold leading-tight truncate",
              selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            )}>
              <PaliText text={chant.title} script={paliScript} />
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              {selected && <Check size={10} className="text-[var(--accent)]" />}
              <span className={cn(
                "text-[0.6rem] font-black uppercase tracking-widest truncate",
                selected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}>
                {selected ? 'Active Selection' : lastUsedText}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right flex items-center gap-3 flex-shrink-0 ml-2">
          <div className="flex flex-col items-end">
            <p className={cn(
              "text-[0.55rem] font-black uppercase tracking-[0.2em] mb-0.5 leading-none",
              selected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            )}>
              Total
            </p>
            <p className={cn(
              "text-base font-bold font-mono leading-none",
              selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}>
              {chant.totalCount.toLocaleString()}
            </p>
          </div>
          {onDelete && (
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }} 
               className="text-[var(--text-faint)] hover:text-red-500 p-1 active:scale-90 transition-transform"
             >
               <Trash2 size={14} />
             </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
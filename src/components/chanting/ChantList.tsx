import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus } from 'lucide-react';
import { ChantCard } from './ChantCard';
import { UserChant } from '../../types';
import { cn } from '../../lib/utils';
import { chantService } from '../../services/ChantService';
import { useI18n } from '../../hooks/useI18n';
import { buildDiacriticRegex } from '../../lib/pali-script';

import { getChantTitle } from '../../services/ChantService';

interface ChantListProps {
  chants: UserChant[];
  selectedChantId: string | null;
  onSelect: (id: string) => void;
  onAddChant: () => void;
  onEditChant?: (chant: UserChant) => void;
  paliScript: string;
}

export function ChantList({ chants, selectedChantId, onSelect, onAddChant, onEditChant, paliScript }: ChantListProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChants = chants
    .filter(c => !c.isDeleted)
    .filter(c => {
      const term = searchTerm.trim();
      if (!term) return true;
      const titleToSearch = getChantTitle(c, t);
      if (titleToSearch.toLowerCase().includes(term.toLowerCase())) return true;
      if (c.title.toLowerCase().includes(term.toLowerCase())) return true;
      try {
        const regex = buildDiacriticRegex(term);
        return regex.test(titleToSearch) || regex.test(c.title);
      } catch {
        return false;
      }
    })
    .filter((chant, index, self) => index === self.findIndex((t) => t.id === chant.id)) // Deduplicate by ID
    .sort((a, b) => {
      // Sort by recent use, then count
      if (a.id === selectedChantId) return -1;
      if (b.id === selectedChantId) return 1;
      const lastA = a.lastUsed || 0;
      const lastB = b.lastUsed || 0;
      if (lastA !== lastB) return lastB - lastA;
      return b.totalCount - a.totalCount;
    });

  return (
    <div className="space-y-6">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-[var(--accent)] transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={t('chant.searchChants')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]/40 transition-all border border-[var(--border-subtle)] text-sm font-medium"
        />
      </div>

      <div className="space-y-3">
        {filteredChants.map(chant => (
          <ChantCard
            key={chant.id}
            chant={chant}
            selected={chant.id === selectedChantId}
            onClick={() => onSelect(chant.id)}
            paliScript={paliScript}
            onEdit={chant.isCustom && onEditChant ? () => onEditChant(chant) : undefined}
            onDelete={chant.isCustom ? async () => {
              if (confirm('Are you sure you want to delete this chant?')) {
                const nextId = await chantService.deleteChant(chant.id);
                if (nextId) {
                  onSelect(nextId);
                }
              }
            } : undefined}
          />
        ))}
        
        <motion.button
          whileHover={{ scale: 1.005, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddChant}
          className="w-full p-4 rounded-[1.2rem] border border-dashed border-[var(--accent)]/40 hover:border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)]/15 text-[var(--accent)] transition-all duration-300 flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider text-xs shadow-sm hover:shadow-md hover:shadow-[var(--accent)]/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] group"
        >
          <div className="p-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-main)] transition-colors duration-300">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span>{t('chant.createCustomChant')}</span>
        </motion.button>
      </div>
    </div>
  );
}

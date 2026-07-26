import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { ChantCard } from './ChantCard';
import { UserChant } from '../../types';
import { cn } from '../../lib/utils';
import { chantService } from '../../services/ChantService';
import { useI18n } from '../../hooks/useI18n';
import { buildDiacriticRegex } from '../../lib/pali-script';

interface ChantListProps {
  chants: UserChant[];
  selectedChantId: string | null;
  onSelect: (id: string) => void;
  onAddChant: () => void;
  paliScript: string;
}

export function ChantList({ chants, selectedChantId, onSelect, onAddChant, paliScript }: ChantListProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChants = chants
    .filter(c => {
      const term = searchTerm.trim();
      if (!term) return true;
      if (c.title.toLowerCase().includes(term.toLowerCase())) return true;
      try {
        const regex = buildDiacriticRegex(term);
        return regex.test(c.title);
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#7f5700] transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={t('chant.searchChants')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#7f5700]/20 transition-all border border-slate-100 dark:border-slate-700"
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
            onDelete={() => {
              if (confirm('Are you sure you want to delete this chant?')) {
                chantService.deleteChant(chant.id);
              }
            }}
          />
        ))}
        
        <button
          onClick={onAddChant}
          className="w-full p-5 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#7f5700]/30 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs"
        >
          <Plus size={16} />
          {t('chant.createCustomChant')}
        </button>
      </div>
    </div>
  );
}

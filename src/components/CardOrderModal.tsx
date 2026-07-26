import React from 'react';
import { ChevronUp, ChevronDown, GripVertical, Check } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { cn } from '../lib/utils';
import { Modal } from './Modal';

export const DEFAULT_CARD_ORDER = [
  'uposatha',
  'sun',
  'pali_vassa',
  'atikkanta',
  'recitation',
  'events',
  'reflection'
];

export function CardOrderModal({
  show,
  onClose,
  cardOrder,
  onUpdate
}: {
  show: boolean;
  onClose: () => void;
  cardOrder: string[];
  onUpdate: (newOrder: string[]) => void;
}) {
  const { t } = useI18n();
  
  // Ensure all possible cards are present in the list
  const currentOrder = React.useMemo(() => {
    const baseOrder = cardOrder.length > 0 ? cardOrder : DEFAULT_CARD_ORDER;
    const result = [...baseOrder];
    
    // Add missing cards from DEFAULT_CARD_ORDER
    DEFAULT_CARD_ORDER.forEach(id => {
      const exists = result.some(item => item === id || item === `!${id}`);
      if (!exists) {
        result.push(id);
      }
    });
    
    return result;
  }, [cardOrder]);

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onUpdate(newOrder);
  };

  const toggleCard = (index: number) => {
    const newOrder = [...currentOrder];
    const id = newOrder[index];
    if (id.startsWith('!')) {
      newOrder[index] = id.substring(1);
    } else {
      newOrder[index] = `!${id}`;
    }
    onUpdate(newOrder);
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={t('calendar.reorderCards') || 'Reorder Cards'}
      maxWidth="lg"
    >
      <div className="flex flex-col h-full">
        <div className="space-y-3 mb-6 pr-1 flex-grow">
          {currentOrder.map((item, index) => {
            const isDisabled = item.startsWith('!');
            const cardId = isDisabled ? item.substring(1) : item;
            
            return (
              <div
                key={cardId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-opacity",
                  isDisabled && "opacity-50"
                )}
                style={{
                  backgroundColor: 'var(--bg-card-alt)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => toggleCard(index)}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all",
                    isDisabled 
                      ? "border-[var(--border-subtle)]" 
                      : "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-main)]"
                  )}
                >
                  {!isDisabled && <Check size={18} strokeWidth={3} />}
                </button>

                <div className="flex-grow flex items-center gap-3">
                  <GripVertical size={20} className="opacity-20 shrink-0" />
                  <span className="font-bold text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {t(`calendar.cards.${cardId}`) || cardId}
                  </span>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => moveCard(index, 'up')}
                    className="p-2 rounded-xl transition-all active:scale-90 disabled:opacity-10"
                    style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button
                    disabled={index === currentOrder.length - 1}
                    onClick={() => moveCard(index, 'down')}
                    className="p-2 rounded-xl transition-all active:scale-90 disabled:opacity-10"
                    style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="btn-primary mt-2"
        >
          {t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}

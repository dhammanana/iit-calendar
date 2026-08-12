import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  inline?: boolean;
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  show,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = 'md',
  inline = false,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!show || inline) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, inline, onClose]);

  if (inline) {
    return <div className="w-full">{children}</div>;
  }

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm bg-black/40"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
            className={cn(
              "w-full rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative border flex flex-col max-h-[90vh] will-change-transform transform-gpu",
              maxWidthMap[maxWidth],
              className
            )}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {title ? (
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  {Icon && <Icon size={24} className="text-[var(--accent)]" />}
                  <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--accent)' }}
                  aria-label="Close modal"
                >
                  <X size="1.5em" />
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5 z-10"
                style={{ color: 'var(--accent)' }}
                aria-label="Close modal"
              >
                <X size="1.5em" />
              </button>
            )}

            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 scrollbar-hide">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

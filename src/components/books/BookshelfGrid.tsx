import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles } from 'lucide-react';
import { BookItem } from '../../types/book';
import { getBookTitle, getBookSubtitle } from '../../lib/bookUtils';

interface BookshelfGridProps {
  books: BookItem[];
  onSelectBook: (bookId: string) => void;
  t: (key: any) => string;
}

export function BookshelfGrid({ books, onSelectBook, t }: BookshelfGridProps) {
  return (
    <div className="max-w-4xl w-full mx-auto px-2 sm:px-4 py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-8 justify-items-center">
        {books.map((book) => {
          const bookTitle = getBookTitle(book, t);
          const bookSubtitle = getBookSubtitle(book, t);

          return (
            <motion.div
              key={book.id}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectBook(book.id)}
              className="group cursor-pointer flex flex-col items-center w-full max-w-[240px]"
            >
              {/* 3D Hardcover Book Container */}
              <div
                className="relative w-full aspect-[3/4.2] rounded-r-xl rounded-l-sm shadow-xl group-hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between p-3 sm:p-5 border border-black/10 text-white"
                style={{
                  background: book.coverImage
                    ? undefined
                    : (book.coverColor || "linear-gradient(135deg, #78350f 0%, #451a03 55%, #1c1917 100%)")
                }}
              >
                {/* Custom Image Cover */}
                {book.coverImage && (
                  <img
                    src={book.coverImage}
                    alt={bookTitle}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                )}

                {/* Subtle Book Spine Shadow & Crease */}
                <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-3 w-[1px] bg-black/20 z-10 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-[13px] w-1.5 bg-gradient-to-r from-white/20 to-transparent z-10 pointer-events-none" />

                {!book.coverImage && (
                  <>
                    {/* Outer Decorative Frame */}
                    <div
                      className="absolute inset-2 border rounded-r-xl rounded-l-sm pointer-events-none opacity-40"
                      style={{ borderColor: book.accentColor || '#f59e0b' }}
                    />

                    {/* Top Ornament */}
                    <div className="relative z-20 flex justify-between items-center pt-1" style={{ color: book.accentColor || '#f59e0b' }}>
                      <Sparkles size={14} className="sm:w-4 sm:h-4" />
                      {book.author && (
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/90">
                          {book.author}
                        </span>
                      )}
                    </div>

                    {/* Center Title & Subtitle */}
                    <div className="relative z-20 my-auto text-center px-1.5 sm:px-2 py-2 sm:py-3 border-y bg-black/25 backdrop-blur-[2px] rounded-lg" style={{ borderColor: `${book.accentColor || '#f59e0b'}40` }}>
                      <h2 className="font-serif text-xs sm:text-lg font-bold leading-tight text-white drop-shadow-md group-hover:text-amber-200 transition-colors break-words hyphens-auto [text-wrap:balance]">
                        {bookTitle}
                      </h2>
                      {bookSubtitle && (
                        <p className="text-[10px] sm:text-xs text-white/80 mt-1 sm:mt-1.5 font-serif italic [text-wrap:pretty]">
                          {bookSubtitle}
                        </p>
                      )}
                    </div>

                    {/* Bottom Decorative Icon */}
                    <div className="relative z-20 flex justify-center items-center pb-1" style={{ color: book.accentColor || '#f59e0b' }}>
                      <BookOpen size={16} className="sm:w-5 sm:h-5" />
                    </div>
                  </>
                )}
              </div>

              {/* Book Label below Cover */}
              <div className="mt-2 sm:mt-3 text-center">
                <h3 className="font-serif text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-saffron dark:group-hover:text-amber-400 transition-colors">
                  {bookTitle}
                </h3>
                {bookSubtitle && (
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    {bookSubtitle}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

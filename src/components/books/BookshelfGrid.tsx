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
                className="relative w-full aspect-[3/4.2] rounded-r-2xl rounded-l-md shadow-xl group-hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between p-3 sm:p-5 border-y border-r border-white/20 text-white"
                style={{
                  background: book.coverImage
                    ? `url(${book.coverImage}) center/cover no-repeat`
                    : (book.coverColor || "linear-gradient(135deg, #78350f 0%, #451a03 55%, #1c1917 100%)")
                }}
              >
                {/* Book Left Spine Shadow */}
                <div className="absolute top-0 bottom-0 left-0 w-4 bg-black/40 border-r border-white/10 z-10 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-4 w-1 bg-gradient-to-r from-white/20 to-transparent z-10 pointer-events-none" />

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
                    <div className="relative z-20 my-auto text-center px-1.5 sm:px-2 py-2 sm:py-4 border-y bg-black/25 backdrop-blur-[2px] rounded-lg" style={{ borderColor: `${book.accentColor || '#f59e0b'}40` }}>
                      <h2 className="font-serif text-base sm:text-2xl font-bold leading-tight text-white drop-shadow-md group-hover:text-amber-200 transition-colors">
                        {bookTitle}
                      </h2>
                      {bookSubtitle && (
                        <p className="text-[10px] sm:text-xs text-white/80 mt-1 sm:mt-2 font-serif italic line-clamp-2">
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
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
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

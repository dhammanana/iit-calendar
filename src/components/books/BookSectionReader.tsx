import React, { useMemo } from 'react';
import { BookSection } from '../../types/book';
import { TextProcessor, Script } from '../../lib/pali-script';
import { SCRIPT_TO_LANG } from '../../lib/bookUtils';

interface BookSectionReaderProps {
  selectedSection: BookSection;
  scriptKey: string;
  searchTerm: string;
  language: string;
  t: (key: any) => string;
  tFor: (lang: string, key: string) => string;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function BookSectionReader({
  selectedSection,
  scriptKey,
  searchTerm,
  language,
  tFor,
  contentRef
}: BookSectionReaderProps) {
  const processedSectionHtml = useMemo(() => {
    if (!selectedSection) return '';
    let html = selectedSection.html;

    // Chant notes should follow the active Pāḷi script, not the UI language.
    const chantNoteLang = SCRIPT_TO_LANG[scriptKey] || language;

    // Process data-i18n-key attribute translations
    html = html.replace(/<([a-z0-9]+)([^>]*?)data-i18n-key="([^"]+)"([^>]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, beforeAttrs, key, afterAttrs, content) => {
      const translated = tFor(chantNoteLang, key) || content;
      return `<${tag}${beforeAttrs}data-i18n-key="${key}" data-no-transliterate="true"${afterAttrs}>${translated}</${tag}>`;
    });

    if (scriptKey !== Script.RO) {
      const tagRegex = /(<[^>]+>)/g;
      const parts = html.split(tagRegex);
      let skipTransliteration = false;

      html = parts.map((part, index) => {
        if (index % 2 === 1) {
          if (/data-no-transliterate="true"/i.test(part) || /class="[^"]*chant-note[^"]*"/i.test(part)) {
            if (!part.startsWith('</')) {
              skipTransliteration = true;
            }
          }
          if (part.startsWith('</') && skipTransliteration) {
            skipTransliteration = false;
          }
          return part;
        } else {
          if (skipTransliteration || !part.trim()) return part;
          if (part.length === 1 && /[\s,.;:!?]/.test(part)) return part;

          try {
            const baseScriptText = TextProcessor.convertFrom(part, Script.RO);
            return TextProcessor.convert(baseScriptText, scriptKey);
          } catch {
            return part;
          }
        }
      }).join('');
    }

    if (searchTerm.trim() && searchTerm.length >= 2) {
      let searchPattern = searchTerm;
      if (scriptKey !== Script.RO && /^[a-zA-Zāīūṃṅñṭḍṇḷḥ\s,.'"-]+$/i.test(searchTerm)) {
        try {
          const baseScriptText = TextProcessor.convertFrom(searchTerm, Script.RO);
          searchPattern = TextProcessor.convert(baseScriptText, scriptKey);
        } catch (e) {
          console.error("Search term conversion failed", e);
        }
      }

      const escapedSearch = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?![^<]*>)${escapedSearch}`, 'gi');
      html = html.replace(regex, (match) => `<mark class="bg-amber-200 dark:bg-amber-500/40 text-slate-900 dark:text-white rounded px-0.5 ring-1 ring-amber-400/50 transition-all duration-300">${match}</mark>`);
    }

    return html;
  }, [selectedSection, scriptKey, searchTerm, language, tFor]);

  return (
    <div className="book-content px-4 sm:px-8 mt-2 overflow-wrap-anywhere">
      <style>{`
        .overflow-wrap-anywhere {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .book-container h1 {
          font-size: 2rem !important;
          border-bottom: 2px solid var(--accent);
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem !important;
          line-height: 1.2;
        }
        .book-container h2 {
          font-size: 1.6rem !important;
          color: var(--accent);
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          font-weight: bold;
          line-height: 1.3;
        }
        .book-container h3 {
          font-size: 1.3rem !important;
          font-weight: 700 !important;
          font-style: normal !important;
          color: var(--accent);
          margin-top: 1.75rem !important;
          margin-bottom: 0.75rem !important;
          line-height: 1.35;
        }
        .book-container .chant-note {
          display: inline-block;
          font-style: italic;
          font-weight: 600;
          color: var(--accent);
          margin: 0 0.25rem;
        }
        .book-container div.chant-note,
        .book-container p.chant-note,
        .book-container blockquote.chant-note {
          display: block;
          border-left: 3px solid var(--accent);
          background: var(--accent-soft);
          padding: 0.5rem 0.85rem;
          margin: 0.75rem 0;
          border-radius: 0.5rem;
          font-style: normal;
          font-weight: 600;
          color: var(--text-primary);
        }
        .book-container p {
          margin-bottom: 0.6rem !important;
          font-size: 1.1rem;
        }
        .book-container li p {
          margin-bottom: 0.35rem !important;
        }
        .book-container ol {
          list-style-type: decimal !important;
          padding-left: 2rem !important;
          margin-top: 0.75rem !important;
          margin-bottom: 1rem !important;
        }
        .book-container ul {
          list-style-type: disc !important;
          padding-left: 2rem !important;
          margin-top: 0.75rem !important;
          margin-bottom: 1rem !important;
        }
        .book-container li {
          display: list-item !important;
          margin-bottom: 0.75rem !important;
        }
        .book-container li::marker {
          font-weight: bold;
          color: var(--accent);
        }
        mark {
          scroll-margin-top: 100px;
        }
      `}</style>
      <div
        ref={contentRef}
        className="book-container prose prose-stone dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-saffron dark:prose-headings:text-amber-500 max-w-none prose-a:text-saffron prose-strong:text-slate-900 dark:prose-strong:text-slate-100"
        script={scriptKey}
        dangerouslySetInnerHTML={{ __html: processedSectionHtml }}
      />
    </div>
  );
}

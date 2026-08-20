import React, { useMemo } from 'react';

// Nav icon assets (crafted for crisp bottom navigation bar rendering)
import meditationNavRaw from '../../assets/icons/nav/meditation.svg?raw';
import chantsNavRaw from '../../assets/icons/nav/chants.svg?raw';
import booksNavRaw from '../../assets/icons/nav/books.svg?raw';
import studyNavRaw from '../../assets/icons/nav/study.svg?raw';

// Header icon assets (original line weights for large screen header pills)
import meditationHeaderRaw from '../../assets/icons/header/meditation.svg?raw';
import chantsHeaderRaw from '../../assets/icons/header/chants.svg?raw';
import booksHeaderRaw from '../../assets/icons/header/books.svg?raw';
import studyHeaderRaw from '../../assets/icons/header/study.svg?raw';

export type ScreenIconType = 'meditation' | 'chants' | 'books' | 'study';

const rawNavIcons: Record<ScreenIconType, string> = {
  meditation: meditationNavRaw,
  chants: chantsNavRaw,
  books: booksNavRaw,
  study: studyNavRaw,
};

const rawHeaderIcons: Record<ScreenIconType, string> = {
  meditation: meditationHeaderRaw,
  chants: chantsHeaderRaw,
  books: booksHeaderRaw,
  study: studyHeaderRaw,
};

interface ScreenIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: ScreenIconType;
  size?: number | string;
  className?: string;
}

/**
 * ScreenIcon renders the dedicated navigation icon with optimal stroke weight and sizing.
 */
export function ScreenIcon({ name, size = '100%', className = '', ...props }: ScreenIconProps) {
  const svgContent = useMemo(() => {
    const raw = rawNavIcons[name];
    if (!raw) return '';

    let processed = raw
      .replace(/<\?xml.*?\?>/g, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/fill="#[0-9a-fA-F]+"/g, 'fill="currentColor"')
      .replace(/stroke="#[0-9a-fA-F]+"/g, 'stroke="currentColor"');

    // Ensure root <svg> fills span container while preserving intrinsic viewBox and stroke
    processed = processed.replace(
      /<svg([^>]*)>/i,
      (_match, attrs) => {
        const cleanAttrs = attrs
          .replace(/\s(width|height)=["'][^"']*["']/gi, '')
          .replace(/\sfill=["'][^"']*["']/gi, '');
        return `<svg${cleanAttrs} width="100%" height="100%" fill="currentColor">`;
      }
    );

    return processed;
  }, [name]);

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      {...props}
    />
  );
}

/**
 * ScreenIconInner renders the header icon scaled and positioned inside a parent SVG viewport.
 */
export function ScreenIconInner({
  name,
  x = 38,
  y = 38,
  width = 24,
  height = 24,
  className = ''
}: {
  name: ScreenIconType;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numW = Number(width) || 24;
  const numH = Number(height) || 24;

  const { content, scaleX, scaleY, offsetX, offsetY } = useMemo(() => {
    const raw = rawHeaderIcons[name];
    if (!raw) return { content: '', scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };

    // Extract viewBox coordinates
    const vbMatch = raw.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
    let vbX = 0, vbY = 0, vbW = 1024, vbH = 1024;
    if (vbMatch) {
      vbX = parseFloat(vbMatch[1]);
      vbY = parseFloat(vbMatch[2]);
      vbW = parseFloat(vbMatch[3]);
      vbH = parseFloat(vbMatch[4]);
    }

    const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    let rawInner = match ? match[1] : '';
    rawInner = rawInner
      .replace(/fill="#[0-9a-fA-F]+"/g, 'fill="currentColor"')
      .replace(/stroke="#[0-9a-fA-F]+"/g, 'stroke="currentColor"');

    const scaleX = numW / vbW;
    const scaleY = numH / vbH;
    const offsetX = numX - vbX * scaleX;
    const offsetY = numY - vbY * scaleY;

    return { content: rawInner, scaleX, scaleY, offsetX, offsetY };
  }, [name, numX, numY, numW, numH]);

  return (
    <g
      transform={`translate(${offsetX}, ${offsetY}) scale(${scaleX}, ${scaleY})`}
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

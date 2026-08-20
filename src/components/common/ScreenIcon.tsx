import React, { useMemo } from 'react';
import meditationRaw from '../../assets/icons/meditation.svg?raw';
import chantsRaw from '../../assets/icons/chants.svg?raw';
import booksRaw from '../../assets/icons/books.svg?raw';
import studyRaw from '../../assets/icons/study.svg?raw';

export type ScreenIconType = 'meditation' | 'chants' | 'books' | 'study';

const rawIcons: Record<ScreenIconType, string> = {
  meditation: meditationRaw,
  chants: chantsRaw,
  books: booksRaw,
  study: studyRaw,
};

interface ScreenIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: ScreenIconType;
  size?: number | string;
  className?: string;
}

export function ScreenIcon({ name, size = '100%', className = '', ...props }: ScreenIconProps) {
  const svgContent = useMemo(() => {
    const raw = rawIcons[name];
    if (!raw) return '';
    let processed = raw
      .replace(/<\?xml.*?\?>/g, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/fill="#[0-9a-fA-F]+"/g, 'fill="currentColor"')
      .replace(/stroke="#[0-9a-fA-F]+"/g, 'stroke="currentColor"');

    // Ensure root <svg> has width="100%" height="100%" and fill="currentColor"
    processed = processed.replace(
      /<svg([^>]*)>/i,
      (_match, attrs) => {
        const cleanAttrs = attrs
          .replace(/\s(width|height)=["'][^"']*["']/gi, '')
          .replace(/\s(fill|stroke)=["'][^"']*["']/gi, '');
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
 * Renders the inner contents of a source SVG file scaled and translated inside a parent <svg> viewport (e.g., header pill).
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
    const raw = rawIcons[name];
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
    // Normalize fill & stroke to currentColor so parent class colors take full effect
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
      stroke="currentColor"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

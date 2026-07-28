import React, { useState, useEffect } from 'react';
import { convertPali, SCRIPTS } from '../services/conversionService';
import { Script } from '../lib/pali-script';
import { cn } from '../lib/utils';

export interface PaliTextProps {
  text: string;
  script?: string;
  isPali?: boolean;
  className?: string;
  as?: React.ElementType;
  style?: React.CSSProperties;
  [key: string]: any;
}

export function PaliText({
  text,
  script = 'roman',
  isPali = true,
  className,
  as: Component = 'span',
  style,
  ...props
}: PaliTextProps) {
  const [displayText, setDisplayText] = useState(text || '');

  useEffect(() => {
    let active = true;
    if (!text || isPali === false) {
      setDisplayText(text || '');
      return;
    }
    convertPali(text, script).then((res) => {
      if (active) {
        setDisplayText(res);
      }
    });
    return () => {
      active = false;
    };
  }, [text, script, isPali]);

  if (isPali === false) {
    return (
      <Component
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: text || '' }}
        {...props}
      />
    );
  }

  const scriptCode =
    SCRIPTS[script] ||
    (Object.values(Script).includes(script as any) ? script : Script.RO);

  return (
    <Component
      className={cn("PT", className)}
      script={scriptCode}
      style={style}
      dangerouslySetInnerHTML={{ __html: displayText }}
      {...props}
    />
  );
}

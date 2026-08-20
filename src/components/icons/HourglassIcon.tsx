import React from 'react';
import { ScreenIcon } from '../common/ScreenIcon';

export function HourglassIcon({ size = 20, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { size?: number }) {
  return <ScreenIcon name="study" size={size} className={className} {...props} />;
}

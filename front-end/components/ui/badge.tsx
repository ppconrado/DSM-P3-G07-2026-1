'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning' | 'neutral';
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        tone === 'default' &&
          'bg-academy-primary/15 text-academy-primary ring-academy-primary/20',
        tone === 'success' &&
          'bg-emerald-600/15 text-emerald-800 ring-emerald-600/20',
        tone === 'warning' &&
          'bg-amber-600/15 text-amber-800 ring-amber-600/20',
        tone === 'neutral' && 'bg-slate-200 text-slate-700 ring-slate-300',
        className,
      )}
      {...props}
    />
  );
}

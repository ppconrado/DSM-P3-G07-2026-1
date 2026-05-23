'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({
  className,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm transition placeholder:text-slate-500 focus:border-academy-primary focus:outline-none focus:ring-2 focus:ring-academy-primary/15',
        className,
      )}
      {...props}
    />
  );
}

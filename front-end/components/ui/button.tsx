'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({
  className,
  asChild = false,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' &&
          'bg-academy-primary text-white shadow-soft hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(0,120,215,0.26)]',
        variant === 'secondary' &&
          'bg-white text-academy-text border border-slate-200 hover:border-academy-secondary hover:text-academy-secondary',
        variant === 'ghost' &&
          'bg-transparent text-academy-text hover:bg-slate-100',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        className,
      )}
      {...props}
    />
  );
}

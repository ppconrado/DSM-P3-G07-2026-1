'use client';

import * as React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={'animate-pulse rounded bg-slate-200/60 ' + className}
      aria-hidden
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} className="h-3 w-full max-w-full rounded-md" />
      ))}
    </div>
  );
}

export default Skeleton;

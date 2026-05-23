'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { site } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-academy-primary via-academy-secondary to-academy-accent text-white shadow-soft">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-academy-text">
              {site.name}
            </p>
            <p className="text-xs text-slate-600">{site.slogan}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/">Início</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/login">
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

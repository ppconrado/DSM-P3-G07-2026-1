'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

type SideNavProps = {
  items: NavItem[];
  title: string;
  description: string;
};

export function SideNav({ items, title, description }: SideNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft backdrop-blur">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-academy-primary to-academy-secondary p-4 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">
          {title}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold">AcademyFlow</h2>
        <p className="mt-2 text-sm text-white/85">{description}</p>
      </div>

      <nav className="space-y-1" aria-label="Navegação do painel">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-primary focus-visible:ring-offset-2',
                active
                  ? 'bg-academy-primary text-white shadow-soft'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-academy-text',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AuthGate } from '@/components/layout/auth-gate';
import { LogoutButton } from '@/components/layout/logout-button';
import { SideNav } from '@/components/layout/side-nav';
import { fetchSession, type UserRole } from '@/lib/auth';
import { site } from '@/lib/site';

type DashboardShellProps = {
  title: string;
  description: string;
  navItems: { href: string; label: string }[];
  children: React.ReactNode;
};

export function DashboardShell({
  title,
  description,
  navItems,
  children,
}: DashboardShellProps) {
  const isParticipantDashboard = navItems.some((item) =>
    item.href.startsWith('/dashboard/participant'),
  );
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response = await fetchSession();

        if (!cancelled) {
          setUserRole(response.user.role);
        }
      } catch {
        if (!cancelled) {
          setUserRole(null);
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const showParticipantAreaButton = !isParticipantDashboard;
  const showAdminReturnButton = isParticipantDashboard && userRole === 'ADMIN';
  const reserveAdminReturnButtonSpace = isParticipantDashboard;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f7fa_0%,#edf3f9_100%)] text-academy-text">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <SideNav items={navItems} title={title} description={description} />
        </div>

        <main id="main-content" className="space-y-6 pb-8" tabIndex={-1}>
          <Card className="flex flex-col gap-4 bg-white/90 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">{site.name}</p>
              <h1 className="font-display text-3xl font-bold text-academy-text">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {showParticipantAreaButton ? (
                <Button variant="secondary" asChild>
                  <Link href="/dashboard/participant">
                    <Users className="h-4 w-4" />
                    Área do participante
                  </Link>
                </Button>
              ) : null}
              {reserveAdminReturnButtonSpace ? (
                <div className="min-w-[10.75rem]">
                  {showAdminReturnButton ? (
                    <Button variant="secondary" asChild className="w-full">
                      <Link href="/dashboard/admin">
                        <Shield className="h-4 w-4" />
                        Área do admin
                      </Link>
                    </Button>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="h-11 rounded-2xl border border-transparent"
                    />
                  )}
                </div>
              ) : null}
              <LogoutButton />
            </div>
          </Card>

          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </div>
  );
}

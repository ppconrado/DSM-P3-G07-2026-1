'use client';

import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { adminNavItems } from '@/lib/site';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <DashboardShell
      title="Dashboard do ADMIN"
      description="Gestão de usuários, eventos, sessões, presença e certificados."
      navItems={adminNavItems}
    >
      {children}
    </DashboardShell>
  );
}

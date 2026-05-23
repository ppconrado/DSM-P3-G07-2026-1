'use client';

import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { participantNavItems } from '@/lib/site';

type ParticipantLayoutProps = {
  children: ReactNode;
};

export default function ParticipantLayout({
  children,
}: ParticipantLayoutProps) {
  return (
    <DashboardShell
      title="Dashboard do Participante"
      description="Acompanhamento de inscrições, presença e certificados."
      navItems={participantNavItems}
    >
      {children}
    </DashboardShell>
  );
}

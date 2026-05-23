'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={handleLogout}
      aria-label="Sair da conta"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </Button>
  );
}

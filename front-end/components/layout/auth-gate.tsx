'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { fetchSession, type UserRole } from '@/lib/auth';

type AuthGateProps = {
  children: React.ReactNode;
};

function canAccessRoute(pathname: string, role: UserRole) {
  if (pathname.startsWith('/dashboard/admin')) {
    return role === 'ADMIN';
  }

  if (pathname.startsWith('/dashboard/participant')) {
    return role === 'ADMIN' || role === 'PARTICIPANTE';
  }

  return true;
}

export function AuthGate({ children }: AuthGateProps) {
  const skipAuthGate = process.env.NEXT_PUBLIC_SKIP_AUTH_GATE === 'true';

  if (skipAuthGate) {
    return <>{children}</>;
  }

  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'ready' | 'redirecting'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      try {
        const response = await fetchSession();

        if (cancelled) {
          return;
        }

        if (!canAccessRoute(pathname, response.user.role)) {
          setStatus('redirecting');
          router.replace(
            response.user.role === 'ADMIN'
              ? '/dashboard/admin'
              : '/dashboard/participant',
          );
          return;
        }

        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('redirecting');
          router.replace('/login');
        }
      }
    }

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return (
    <div className="relative">
      <div
        aria-hidden={status !== 'ready'}
        className={
          status === 'ready' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }
      >
        {children}
      </div>

      {status !== 'ready' ? (
        <div className="absolute inset-0 flex min-h-[40vh] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-academy-primary" />
            Validando sessão...
          </div>
        </div>
      ) : null}
    </div>
  );
}

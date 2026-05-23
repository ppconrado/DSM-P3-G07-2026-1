'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SiteHeader } from '@/components/layout/site-header';
import { loginWithEmailAndPassword } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginWithEmailAndPassword(email, password);
      router.replace(
        response.user.role === 'ADMIN'
          ? '/dashboard/admin'
          : '/dashboard/participant',
      );
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Erro ao realizar login.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-academy-hero">
      <SiteHeader />

      <main className="mx-auto flex max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardHeader>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-academy-primary">
                Acesso restrito
              </p>
              <CardTitle className="mt-2 text-3xl">
                Entrar no AcademyFlow
              </CardTitle>
              <CardDescription className="mt-2 text-slate-700">
                Autenticação via back-end Express com cookies HttpOnly e
                redirecionamento por role.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-800">
                E-mail
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <Input
                    type="email"
                    placeholder="voce@instituicao.edu"
                    className="pl-11"
                    value={email}
                    required
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-800">
                Senha
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-11"
                    value={password}
                    required
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>

              {error ? (
                <p
                  className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-academy-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

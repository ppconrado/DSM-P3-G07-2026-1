'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Phone, User } from 'lucide-react';
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
import { apiFetch } from '@/lib/api';
import { loginWithEmailAndPassword } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // create user as PARTICIPANTE
      await apiFetch('/users', {
        method: 'POST',
        json: { name, email, phone, password, role: 'PARTICIPANTE' },
      });

      // auto-login
      await loginWithEmailAndPassword(email, password);

      router.replace('/dashboard/participant');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-academy-hero">
      <SiteHeader />

      <main className="mx-auto flex max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-academy-primary">
                Registrar
              </p>
              <CardTitle className="mt-2 text-3xl">Criar nova conta</CardTitle>
              <CardDescription className="mt-2">
                Crie sua conta de participante para acessar eventos, inscrições
                e certificados.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome completo
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    className="pl-11"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                E-mail
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="voce@instituicao.edu"
                    className="pl-11"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Telefone
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="pl-11"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Senha
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="Senha"
                    className="pl-11"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </label>

              {error ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

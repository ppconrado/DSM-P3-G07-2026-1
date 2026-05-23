import Link from 'next/link';
import { MailQuestion, ArrowRight } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-academy-hero">
      <SiteHeader />
      <main className="mx-auto flex max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-xl border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardHeader>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-academy-primary">
                Recuperação de acesso
              </p>
              <CardTitle className="mt-2 text-3xl">
                Esqueci minha senha
              </CardTitle>
              <CardDescription className="mt-2 text-slate-700">
                Fluxo preparado para envio de instruções por e-mail via
                back-end.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-800">
                E-mail da conta
                <div className="relative">
                  <MailQuestion className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <Input
                    type="email"
                    placeholder="voce@instituicao.edu"
                    className="pl-11"
                    required
                  />
                </div>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button type="submit" size="lg">
                  Enviar instruções
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-academy-primary hover:underline"
                >
                  Voltar para o login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

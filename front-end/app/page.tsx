import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/site-header';
import { site } from '@/lib/site';

const highlights = [
  {
    title: 'Gestão completa',
    description:
      'Eventos, sessões, inscrições, presença e certificados em um único fluxo.',
  },
  {
    title: 'Acesso restrito por papel',
    description:
      'Participante e ADMIN com rotas separadas e permissões consistentes.',
  },
  {
    title: 'Integração pronta',
    description:
      'Comunicação com a API em Express via cookies HttpOnly e CORS com credenciais.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-academy-hero text-academy-text">
      <SiteHeader />

      <main className="academy-grid">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8 lg:py-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-academy-accent" />
              Plataforma para cursos, workshops e palestras
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="font-display text-5xl font-bold tracking-tight text-academy-text sm:text-6xl">
                {site.name} organiza a jornada acadêmica do início ao
                certificado.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                Um front-end moderno para administrar eventos, controlar
                presenças, acompanhar inscrições e liberar certificados com base
                nas regras do sistema e na API Express.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Entrar no sistema
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Registrar</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/forgot-password">
                  <LockKeyhole className="h-4 w-4" />
                  Esqueci minha senha
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {highlights.map((highlight) => (
                <Card key={highlight.title}>
                  <CardHeader>
                    <CardTitle className="text-lg">{highlight.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{highlight.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="overflow-hidden border-white/70 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div className="bg-gradient-to-br from-academy-primary via-cyan-500 to-academy-secondary p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">
                  AcademyFlow
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold">
                  Conectando conhecimento e experiências
                </h2>
                <p className="mt-3 text-sm text-white/90">
                  Interface pensada para login institucional, dashboards
                  separados e navegação responsiva.
                </p>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/6 p-4">
                  <CalendarDays className="h-5 w-5 text-academy-secondary" />
                  <p className="mt-3 font-semibold">Eventos com sessões</p>
                  <p className="mt-2 text-sm text-white/80">
                    Cadastro, agenda, lotação e acompanhamento.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/6 p-4">
                  <ShieldCheck className="h-5 w-5 text-academy-accent" />
                  <p className="mt-3 font-semibold">Acesso seguro</p>
                  <p className="mt-2 text-sm text-white/80">
                    JWT em cookie HttpOnly com refresh e logout no servidor.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rotas principais</CardTitle>
                <CardDescription>
                  Fluxo inicial para o MVP do front-end.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-academy-text">
                    Público:
                  </span>{' '}
                  landing page, login e recuperação de senha.
                </p>
                <p>
                  <span className="font-semibold text-academy-text">
                    Participante:
                  </span>{' '}
                  eventos, inscrições, certificados e perfil.
                </p>
                <p>
                  <span className="font-semibold text-academy-text">
                    ADMIN:
                  </span>{' '}
                  usuários, eventos, palestrantes, sessões, presença e
                  certificados.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

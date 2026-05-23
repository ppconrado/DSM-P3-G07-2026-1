'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleCheckBig,
  FileBadge2,
  Sparkles,
  UserCircle2,
  BookOpenText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateOnlyUTC } from '@/lib/date';
import { apiFetch } from '@/lib/api';
import { fetchSession } from '@/lib/auth';
import type {
  CertificateRecord,
  EventRecord,
  RegistrationRecord,
} from '@/lib/domain';

export default function ParticipantDashboardPage() {
  const [userId, setUserId] = useState('');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [session, eventList, registrationList, certificateList] =
          await Promise.all([
            fetchSession(),
            apiFetch<EventRecord[]>('/events'),
            apiFetch<RegistrationRecord[]>('/registrations'),
            apiFetch<CertificateRecord[]>('/certificates'),
          ]);

        if (!active) return;

        setUserId(session.user.id);
        setEvents(eventList);
        setRegistrations(registrationList);
        setCertificates(certificateList);
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar dashboard.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const myRegistrations = useMemo(
    () =>
      registrations.filter(
        (registration) => registration.participantId === userId,
      ),
    [registrations, userId],
  );

  const myCertificates = useMemo(
    () =>
      certificates.filter((certificate) =>
        myRegistrations.some(
          (registration) => registration.id === certificate.registrationId,
        ),
      ),
    [certificates, myRegistrations],
  );

  const availableEvents = useMemo(
    () => events.filter((event) => event.status === 'ATIVA').length,
    [events],
  );

  const approvedRegistrations = useMemo(
    () =>
      myRegistrations.filter(
        (registration) => registration.approvedForCertificate,
      ).length,
    [myRegistrations],
  );

  const activeRegistrations = useMemo(
    () =>
      myRegistrations.filter((registration) => registration.status === 'ATIVO')
        .length,
    [myRegistrations],
  );

  const attendanceAverage = useMemo(() => {
    if (myRegistrations.length === 0) return 0;

    const total = myRegistrations.reduce(
      (sum, registration) => sum + registration.attendancePercent,
      0,
    );
    return Math.round(total / myRegistrations.length);
  }, [myRegistrations]);

  const cards = [
    {
      label: 'Eventos disponíveis',
      value: String(availableEvents),
      icon: CalendarDays,
    },
    {
      label: 'Minhas inscrições',
      value: String(myRegistrations.length),
      icon: BookOpenText,
    },
    {
      label: 'Certificados',
      value: String(myCertificates.length),
      icon: FileBadge2,
    },
    {
      label: 'Aptos para emissão',
      value: String(approvedRegistrations),
      icon: CircleCheckBig,
    },
    { label: 'Perfil', value: 'Ativo', icon: UserCircle2 },
  ];

  const recentEvents = useMemo(
    () =>
      [...events]
        .sort(
          (left, right) =>
            new Date(left.startDate).getTime() -
            new Date(right.startDate).getTime(),
        )
        .slice(0, 3),
    [events],
  );

  const nextEvent = recentEvents[0];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-academy-primary/90 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              Centro do participante
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Seu progresso, certificados e eventos em um só lugar.
              </h2>
              <p className="max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Acompanhe inscrições ativas, presença acumulada e emissão de
                certificados com status atualizado.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">
              Próximo evento
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {nextEvent?.title ?? 'Nenhum evento ativo'}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {nextEvent
                ? `${formatDateOnlyUTC(nextEvent.startDate)} · ${nextEvent.location}`
                : 'Quando houver um evento ativo, ele aparecerá aqui.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? cards.map((card) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.label}
                  className="h-full overflow-hidden border-slate-200"
                >
                  <CardContent className="flex h-full items-center justify-between gap-4 p-5">
                    <div className="flex min-h-[4.5rem] flex-1 flex-col justify-center space-y-1">
                      <p className="min-h-[2.75rem] text-sm font-medium leading-5 text-slate-500">
                        {card.label}
                      </p>
                      <p className="font-display text-3xl font-bold text-academy-text">
                        --
                      </p>
                    </div>
                    <div className="self-start rounded-2xl bg-academy-primary/10 p-3 text-academy-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          : cards.map((card) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.label}
                  className="h-full overflow-hidden border-slate-200"
                >
                  <CardContent className="flex h-full items-center justify-between gap-4 p-5">
                    <div className="flex min-h-[4.5rem] flex-1 flex-col justify-center space-y-1">
                      <p className="min-h-[2.75rem] text-sm font-medium leading-5 text-slate-500">
                        {card.label}
                      </p>
                      <p className="font-display text-3xl font-bold text-academy-text">
                        {card.value}
                      </p>
                    </div>
                    <div className="self-start rounded-2xl bg-academy-primary/10 p-3 text-academy-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-slate-200">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle>Eventos disponíveis</CardTitle>
              <CardDescription>
                Cadastro e inscrição direta em eventos abertos.
              </CardDescription>
            </div>
            <Badge tone="success">Participante</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p>Carregando eventos...</p>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-academy-text">
                        {event.title}
                      </p>
                      <Badge
                        tone={event.status === 'ATIVA' ? 'success' : 'neutral'}
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateOnlyUTC(event.startDate)} · {event.location} ·{' '}
                      {event.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader>
            <CardTitle>Seu progresso</CardTitle>
            <CardDescription>
              Indicadores principais da conta do participante.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-medium text-emerald-800">
                Presença acumulada
              </p>
              <p className="mt-2 font-mono text-3xl text-emerald-900">
                {attendanceAverage}%
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <p className="text-sm font-medium text-blue-800">
                Certificado liberado
              </p>
              <p className="mt-2 text-sm text-blue-900">
                {myCertificates.length > 0
                  ? 'Disponível na aba de certificados.'
                  : approvedRegistrations > 0
                    ? 'Você já está apto para emissão.'
                    : 'Disponível quando o percentual mínimo for atingido.'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-700">
                Dados do perfil
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {activeRegistrations} inscrições ativas no momento. Nome,
                telefone e senha editáveis conforme regra.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Calendar,
  Speaker,
  ClipboardCheck,
  FileBadge2,
  BarChart3,
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
import type {
  CertificateRecord,
  EventRecord,
  RegistrationRecord,
  SpeakerRecord,
  UserRecord,
} from '@/lib/domain';

function statusTone(status: EventRecord['status']) {
  if (status === 'ATIVA') return 'success';
  if (status === 'CRIANDO') return 'warning';
  if (status === 'CANCELADA') return 'neutral';
  return 'default';
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [
          eventList,
          userList,
          speakerList,
          certificateList,
          registrationList,
        ] = await Promise.all([
          apiFetch<EventRecord[]>('/events'),
          apiFetch<UserRecord[]>('/users?includeInactive=true'),
          apiFetch<SpeakerRecord[]>('/speakers'),
          apiFetch<CertificateRecord[]>('/certificates'),
          apiFetch<RegistrationRecord[]>('/registrations'),
        ]);

        if (!active) return;

        setEvents(eventList);
        setUsers(userList);
        setSpeakers(speakerList);
        setCertificates(certificateList);
        setRegistrations(registrationList);
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

  const metrics = useMemo(() => {
    const activeEvents = events.filter(
      (event) => event.status === 'ATIVA',
    ).length;
    const activeParticipants = users.filter(
      (user) => user.role === 'PARTICIPANTE' && user.isActive !== false,
    ).length;
    const totalSpeakers = speakers.length;
    const totalCertificates = certificates.length;

    return [
      { label: 'Eventos ativos', value: String(activeEvents), icon: Calendar },
      {
        label: 'Participantes',
        value: String(activeParticipants),
        icon: Users,
      },
      { label: 'Palestrantes', value: String(totalSpeakers), icon: Speaker },
      {
        label: 'Certificados emitidos',
        value: String(totalCertificates),
        icon: FileBadge2,
      },
    ];
  }, [certificates.length, events, speakers.length, users]);

  const ongoingEvents = useMemo(
    () => events.filter((event) => event.status === 'ATIVA').length,
    [events],
  );

  const pendingAttendance = useMemo(
    () =>
      registrations.filter(
        (registration) => registration.attendancePercent < 75,
      ).length,
    [registrations],
  );

  const eligibleCertificates = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.approvedForCertificate ||
          registration.attendancePercent >= 75,
      ).length,
    [registrations],
  );

  const recentEvents = useMemo(
    () =>
      [...events]
        .sort(
          (left, right) =>
            new Date(right.startDate).getTime() -
            new Date(left.startDate).getTime(),
        )
        .slice(0, 3),
    [events],
  );

  const topSpeakers = useMemo(
    () =>
      [...speakers]
        .sort(
          (left, right) =>
            (right.eventIds?.length ?? 0) - (left.eventIds?.length ?? 0),
        )
        .slice(0, 3),
    [speakers],
  );

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label}>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600">{metric.label}</p>
                      <p className="mt-2 font-display text-3xl font-bold text-academy-text">
                        --
                      </p>
                    </div>
                    <div className="rounded-2xl bg-academy-primary/10 p-3 text-academy-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          : metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label}>
                  <CardContent className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600">{metric.label}</p>
                      <p className="mt-2 font-display text-3xl font-bold text-academy-text">
                        {metric.value}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-academy-primary/10 p-3 text-academy-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operações administrativas</CardTitle>
              <CardDescription>
                Fluxos priorizados para o primeiro ciclo do front-end.
              </CardDescription>
            </div>
            <Badge tone="success">ADMIN</Badge>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-academy-text">
                Gerenciar usuários
              </p>
              <p className="mt-2 text-sm text-slate-600">
                CRUD de participantes, alteração de role e status.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-academy-text">
                Gerenciar eventos
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Cadastro, edição, lotação e vinculação de palestrantes.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-academy-text">Marcar presença</p>
              <p className="mt-2 text-sm text-slate-600">
                Controle por sessão com atualização de percentuais.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-academy-text">
                Emitir certificados
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Geração, upload e acompanhamento de certificados PDF.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo operacional</CardTitle>
            <CardDescription>
              Visão rápida do estado do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <span className="text-sm font-medium text-emerald-800">
                Eventos em andamento
              </span>
              <span className="font-mono text-lg text-emerald-900">
                {ongoingEvents}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-800">
                Pendências de presença
              </span>
              <span className="font-mono text-lg text-blue-900">
                {pendingAttendance}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">
                Certificados aptos
              </span>
              <span className="font-mono text-lg text-amber-900">
                {eligibleCertificates}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">
                Regra mínima de presença
              </span>
              <span className="font-mono text-lg text-slate-900">75%</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
            <CardDescription>
              Listagem inicial para CRUD e filtros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {loading ? (
              <p>Carregando eventos...</p>
            ) : (
              recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-academy-text">
                      {event.title}
                    </p>
                    <Badge tone={statusTone(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {formatDateOnlyUTC(event.startDate)} até{' '}
                    {formatDateOnlyUTC(event.endDate)} · {event.location}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Palestrantes vinculados</CardTitle>
            <CardDescription>
              Integração entre speakers e eventos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {loading ? (
              <p>Carregando palestrantes...</p>
            ) : (
              topSpeakers.map((speaker) => (
                <p key={speaker.id}>
                  • {speaker.name} - {speaker.eventIds?.length ?? 0} evento(s)
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Indicadores</CardTitle>
            <CardDescription>
              Painel para evolução do dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-academy-secondary" />{' '}
              Presenças marcadas por inscrição
            </p>
            <p className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-academy-accent" /> Taxa média
              de aprovação
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 text-academy-primary" /> Novos
              participantes
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

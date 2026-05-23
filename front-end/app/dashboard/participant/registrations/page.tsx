'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateOnlyUTC } from '@/lib/date';
import { apiFetch } from '@/lib/api';
import { fetchSession, type AuthUser } from '@/lib/auth';
import type {
  CertificateRecord,
  EventRecord,
  RegistrationRecord,
} from '@/lib/domain';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function statusTone(status: RegistrationRecord['status']) {
  if (status === 'ATIVO') return 'success';
  if (status === 'CANCELADO') return 'neutral';
  return 'warning';
}

function ParticipantRegistrationsPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | RegistrationRecord['status']
  >(() => {
    const value = searchParams.get('status');
    if (value === 'ATIVO' || value === 'CANCELADO' || value === 'CONCLUIDO') {
      return value;
    }

    return 'all';
  });
  const [certificateFilter, setCertificateFilter] = useState<
    'all' | 'issued' | 'eligible' | 'pending' | 'ineligible'
  >(() => {
    const value = searchParams.get('certificate');
    if (
      value === 'issued' ||
      value === 'eligible' ||
      value === 'pending' ||
      value === 'ineligible'
    ) {
      return value;
    }

    return 'all';
  });
  const [eventFilter, setEventFilter] = useState(
    () => searchParams.get('event') ?? 'all',
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('from') ?? '',
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [session, registrationList, eventList, certificateList] =
          await Promise.all([
            fetchSession(),
            apiFetch<RegistrationRecord[]>('/registrations'),
            apiFetch<EventRecord[]>('/events'),
            apiFetch<CertificateRecord[]>('/certificates'),
          ]);

        if (!active) return;

        setUser(session.user);
        setRegistrations(registrationList);
        setEvents(eventList);
        setCertificates(certificateList);
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar inscrições.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const userRegistrations = useMemo(
    () =>
      registrations.filter(
        (registration) => registration.participantId === user?.id,
      ),
    [registrations, user?.id],
  );

  const registrationsWithEvent = useMemo(() => {
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const certificatesByRegistrationId = new Map(
      certificates.map((certificate) => [
        certificate.registrationId,
        certificate,
      ]),
    );

    return userRegistrations
      .map((registration) => ({
        registration,
        event: eventsById.get(registration.eventId),
        certificate: certificatesByRegistrationId.get(registration.id),
      }))
      .sort(
        (left, right) =>
          new Date(right.registration.registrationDate).getTime() -
          new Date(left.registration.registrationDate).getTime(),
      );
  }, [certificates, events, userRegistrations]);

  const filteredRegistrations = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return registrationsWithEvent.filter(
      ({ registration, event, certificate }) => {
        if (statusFilter !== 'all' && registration.status !== statusFilter) {
          return false;
        }

        if (eventFilter !== 'all' && registration.eventId !== eventFilter) {
          return false;
        }

        const registrationDateOnly = registration.registrationDate.slice(0, 10);
        if (dateFrom && registrationDateOnly < dateFrom) {
          return false;
        }

        if (dateTo && registrationDateOnly > dateTo) {
          return false;
        }

        if (certificateFilter === 'issued' && !certificate) {
          return false;
        }

        if (
          certificateFilter === 'eligible' &&
          !registration.approvedForCertificate
        ) {
          return false;
        }

        if (
          certificateFilter === 'pending' &&
          registration.approvedForCertificate
        ) {
          return false;
        }

        if (
          certificateFilter === 'ineligible' &&
          registration.approvedForCertificate
        ) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = normalizeSearchText(
          [
            event?.title ?? '',
            event?.location ?? '',
            event?.type ?? '',
            registration.status,
            formatDateOnlyUTC(registration.registrationDate),
            registration.attendancePercent.toFixed(0),
            certificate?.verificationCode ?? '',
            certificate ? 'emitido' : '',
            registration.approvedForCertificate ? 'apto' : 'pendente',
          ].join(' '),
        );

        return searchableText.includes(normalizedSearchTerm);
      },
    );
  }, [
    dateFrom,
    dateTo,
    eventFilter,
    registrationsWithEvent,
    searchTerm,
    statusFilter,
    certificateFilter,
  ]);

  const eventOptions = useMemo(
    () =>
      [...events]
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((event) => ({ id: event.id, title: event.title })),
    [events],
  );

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    certificateFilter !== 'all' ||
    eventFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (certificateFilter !== 'all')
      params.set('certificate', certificateFilter);
    if (eventFilter !== 'all') params.set('event', eventFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    return params;
  }, [
    certificateFilter,
    dateFrom,
    dateTo,
    eventFilter,
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    const nextQueryString = filterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [filterParams, pathname, router, searchParams]);

  const stats = useMemo(() => {
    const issued = registrationsWithEvent.filter(
      ({ certificate }) => certificate,
    ).length;
    const eligible = registrationsWithEvent.filter(
      ({ registration }) => registration.approvedForCertificate,
    ).length;
    const inProgress = registrationsWithEvent.filter(
      ({ registration }) =>
        !registration.approvedForCertificate && registration.status === 'ATIVO',
    ).length;

    return { issued, eligible, inProgress };
  }, [registrationsWithEvent]);

  function getCertificateStatusLabel(
    registration: RegistrationRecord,
    certificate?: CertificateRecord,
    event?: EventRecord,
  ) {
    if (certificate) return 'Certificado emitido';
    if (registration.status === 'CANCELADO') return 'Inscrição cancelada';
    if (registration.approvedForCertificate) return 'Apto para emissão';
    const requiredPercent = event?.certificateRequiredPercent ?? 75;
    return `Faltam ${Math.max(
      0,
      requiredPercent - registration.attendancePercent,
    ).toFixed(0)}%`;
  }

  function getCertificateStatusTone(
    registration: RegistrationRecord,
    certificate?: CertificateRecord,
  ) {
    if (certificate) return 'success';
    if (registration.status === 'CANCELADO') return 'neutral';
    if (registration.approvedForCertificate) return 'warning';
    return 'warning';
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inscrições</CardTitle>
          <CardDescription>
            Fluxo para acompanhar eventos registrados e situação atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Inscrições ativas
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {
                  userRegistrations.filter((item) => item.status === 'ATIVO')
                    .length
                }
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Aptas para certificado
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.eligible}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Certificados emitidos
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.issued}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar inscrição
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Evento, local, tipo, status, código ou presença"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Evento
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                  value={eventFilter}
                  onChange={(event) => setEventFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {eventOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Certificado
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                  value={certificateFilter}
                  onChange={(event) =>
                    setCertificateFilter(
                      event.target.value as typeof certificateFilter,
                    )
                  }
                >
                  <option value="all">Todos</option>
                  <option value="issued">Emitidos</option>
                  <option value="eligible">Aptos</option>
                  <option value="pending">Pendentes</option>
                  <option value="ineligible">Não aptos</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data inicial
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data final
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 xl:col-span-2">
              <Button
                type="button"
                variant={statusFilter === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos status
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'ATIVO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('ATIVO')}
              >
                Ativas
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'CONCLUIDO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('CONCLUIDO')}
              >
                Concluídas
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'CANCELADO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('CANCELADO')}
              >
                Canceladas
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCertificateFilter('all');
                    setEventFilter('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </div>

          {loading ? <p>Carregando inscrições...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && filteredRegistrations.length === 0 ? (
            <p>Nenhuma inscrição encontrada para o seu usuário.</p>
          ) : null}

          <div className="space-y-3">
            {filteredRegistrations.map(
              ({ registration, event, certificate }) => {
                const certificateLabel = getCertificateStatusLabel(
                  registration,
                  certificate,
                  event,
                );

                return (
                  <div
                    key={registration.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-academy-text">
                              {event?.title ?? `Evento ${registration.eventId}`}
                            </p>
                            <Badge tone={statusTone(registration.status)}>
                              {registration.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {event?.location ?? 'Local não informado'} ·{' '}
                            {event?.type ?? 'Tipo não informado'}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Inscrição
                            </p>
                            <p className="mt-1 text-sm font-semibold text-academy-text">
                              {formatDateOnlyUTC(registration.registrationDate)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Presença
                            </p>
                            <p className="mt-1 text-sm font-semibold text-academy-text">
                              {registration.attendancePercent.toFixed(0)}%
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Sessões
                            </p>
                            <p className="mt-1 text-sm font-semibold text-academy-text">
                              {registration.attendedSessionsCount}/
                              {registration.totalSessionsCount}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Certificado
                            </p>
                            <p className="mt-1 text-sm font-semibold text-academy-text">
                              {certificate ? 'Emitido' : 'Não emitido'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-700">
                              Status de certificado
                            </p>
                            <Badge
                              tone={getCertificateStatusTone(
                                registration,
                                certificate,
                              )}
                            >
                              {certificateLabel}
                            </Badge>
                          </div>

                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-academy-primary transition-all"
                              style={{
                                width: `${Math.min(100, registration.attendancePercent)}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            Apto quando atinge o percentual mínimo do evento.{' '}
                            {event?.certificateRequiredPercent
                              ? `Meta atual: ${event.certificateRequiredPercent}%.`
                              : 'Meta padrão: 75%.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {certificate ? (
                          <a
                            href={certificate.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20"
                          >
                            Baixar certificado
                          </a>
                        ) : null}
                        {registration.approvedForCertificate ? (
                          <Badge tone="success">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Apto para emissão
                          </Badge>
                        ) : (
                          <Badge tone="warning">
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Em andamento
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function ParticipantRegistrationsPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantRegistrationsPageContent />
    </Suspense>
  );
}

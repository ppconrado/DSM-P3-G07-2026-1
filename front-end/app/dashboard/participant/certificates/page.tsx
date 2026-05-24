'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, Download, Search, ShieldCheck } from 'lucide-react';
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
import { useToast } from '@/components/ui/toast';
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

function ParticipantCertificatesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [eventFilter, setEventFilter] = useState(
    () => searchParams.get('event') ?? 'all',
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('from') ?? '',
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [session, certificateList, registrationList, eventList] =
          await Promise.all([
            fetchSession(),
            apiFetch<CertificateRecord[]>('/certificates'),
            apiFetch<RegistrationRecord[]>('/registrations'),
            apiFetch<EventRecord[]>('/events'),
          ]);

        if (!active) return;

        setUser(session.user);
        setCertificates(certificateList);
        setRegistrations(registrationList);
        setEvents(eventList);
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar certificados.',
        );
        addToast(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar certificados.',
          'error',
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
  }, [addToast]);

  const userCertificates = useMemo(() => {
    const registrationsById = new Map(
      registrations.map((registration) => [registration.id, registration]),
    );
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return certificates
      .filter((certificate) => {
        const registration = registrationsById.get(certificate.registrationId);
        return registration?.participantId === user?.id;
      })
      .map((certificate) => {
        const registration = registrationsById.get(certificate.registrationId);
        const event = registration
          ? eventsById.get(registration.eventId)
          : undefined;

        return { certificate, registration, event };
      });
  }, [certificates, events, registrations, user?.id]);

  const filteredCertificates = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return userCertificates
      .filter(({ certificate, registration, event }) => {
        if (eventFilter !== 'all' && registration?.eventId !== eventFilter) {
          return false;
        }

        const issueDateOnly = certificate.issueDate.slice(0, 10);
        if (dateFrom && issueDateOnly < dateFrom) {
          return false;
        }

        if (dateTo && issueDateOnly > dateTo) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = normalizeSearchText(
          [
            certificate.verificationCode,
            formatDateOnlyUTC(certificate.issueDate),
            certificate.attendancePercentAtIssue.toFixed(0),
            event?.title ?? '',
            event?.location ?? '',
            event?.type ?? '',
          ].join(' '),
        );

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort(
        (left, right) =>
          new Date(right.certificate.issueDate).getTime() -
          new Date(left.certificate.issueDate).getTime(),
      );
  }, [dateFrom, dateTo, eventFilter, searchTerm, userCertificates]);

  const eventOptions = useMemo(
    () =>
      [
        ...new Map(
          userCertificates.map(({ event }) => [event?.id ?? '', event]),
        ),
      ]
        .map(([, event]) => event)
        .filter((event): event is EventRecord => Boolean(event))
        .sort((left, right) => left.title.localeCompare(right.title)),
    [userCertificates],
  );

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (eventFilter !== 'all') params.set('event', eventFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    return params;
  }, [dateFrom, dateTo, eventFilter, searchTerm]);

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
    const total = userCertificates.length;
    const recent = userCertificates.filter(
      ({ certificate }) =>
        new Date(certificate.issueDate).getTime() >=
        new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 1,
          1,
        ).getTime(),
    ).length;
    const averagePresence = total
      ? userCertificates.reduce(
          (sum, { certificate }) => sum + certificate.attendancePercentAtIssue,
          0,
        ) / total
      : 0;

    return { total, recent, averagePresence };
  }, [userCertificates]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    eventFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Meus certificados</CardTitle>
          <CardDescription>
            Visualização do status e acesso ao arquivo PDF quando liberado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Certificados emitidos
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.total}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Emitidos no último mês
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.recent}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Presença média na emissão
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.averagePresence.toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar certificado
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Evento, código, local, tipo, presença"
              />
            </label>

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
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setEventFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                disabled={!hasActiveFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>

          {loading ? <p>Carregando certificados...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && filteredCertificates.length === 0 ? (
            <p>Você ainda não possui certificados disponíveis.</p>
          ) : null}

          <div className="space-y-3">
            {filteredCertificates.map(
              ({ certificate, registration, event }) => (
                <div
                  key={certificate.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-academy-text">
                            {event?.title ??
                              `Evento ${registration?.eventId ?? certificate.registrationId}`}
                          </p>
                          <Badge tone="success">
                            <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                            Certificado válido
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
                            Emissão
                          </p>
                          <p className="mt-1 text-sm font-semibold text-academy-text">
                            {formatDateOnlyUTC(certificate.issueDate)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Presença
                          </p>
                          <p className="mt-1 text-sm font-semibold text-academy-text">
                            {certificate.attendancePercentAtIssue.toFixed(0)}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Código
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-academy-text">
                            {certificate.verificationCode}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            PDF
                          </p>
                          <p className="mt-1 text-sm font-semibold text-academy-text">
                            Disponível para download
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        O certificado foi emitido com base na presença mínima do
                        evento e pode ser verificado pelo código informado.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <a
                        href={certificate.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Baixar PDF
                      </a>
                      <Badge tone="success">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Emitido
                      </Badge>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function ParticipantCertificatesPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantCertificatesPageContent />
    </Suspense>
  );
}

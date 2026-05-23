'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { useToast } from '@/components/ui/toast';
import type { EventRecord, RegistrationRecord, UserRecord } from '@/lib/domain';

function statusTone(status: RegistrationRecord['status']) {
  if (status === 'ATIVO') return 'success';
  if (status === 'CANCELADO') return 'neutral';
  return 'warning';
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function AdminRegistrationsPageContent() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
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
  const [eventFilter, setEventFilter] = useState(
    () => searchParams.get('event') ?? 'all',
  );
  const [certificateFilter, setCertificateFilter] = useState<
    'all' | 'approved' | 'pending'
  >(() => {
    const value = searchParams.get('certificate');
    if (value === 'approved' || value === 'pending') {
      return value;
    }

    return 'all';
  });
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
        const [registrationList, userList, eventList] = await Promise.all([
          apiFetch<RegistrationRecord[]>('/registrations'),
          apiFetch<UserRecord[]>('/users?includeInactive=true'),
          apiFetch<EventRecord[]>('/events'),
        ]);

        if (!active) return;

        setRegistrations(registrationList);
        setUsers(userList);
        setEvents(eventList);
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar inscrições.',
        );
        addToast(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar inscrições.',
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
  }, []);

  const registrationsWithRelations = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return registrations
      .map((registration) => ({
        registration,
        user: usersById.get(registration.participantId),
        event: eventsById.get(registration.eventId),
      }))
      .sort(
        (left, right) =>
          new Date(right.registration.registrationDate).getTime() -
          new Date(left.registration.registrationDate).getTime(),
      );
  }, [events, registrations, users]);

  const filteredRegistrations = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return registrationsWithRelations.filter(
      ({ registration, user, event }) => {
        if (statusFilter !== 'all' && registration.status !== statusFilter) {
          return false;
        }

        if (eventFilter !== 'all' && registration.eventId !== eventFilter) {
          return false;
        }

        if (
          certificateFilter === 'approved' &&
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

        const registrationDateOnly = registration.registrationDate.slice(0, 10);

        if (dateFrom && registrationDateOnly < dateFrom) {
          return false;
        }

        if (dateTo && registrationDateOnly > dateTo) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = normalizeSearchText(
          [
            user?.name ?? '',
            user?.email ?? '',
            event?.title ?? '',
            event?.location ?? '',
            event?.type ?? '',
            registration.status,
            formatDateOnlyUTC(registration.registrationDate),
            registration.attendancePercent.toFixed(0),
            registration.approvedForCertificate ? 'aprovado' : 'pendente',
          ].join(' '),
        );

        return searchableText.includes(normalizedSearchTerm);
      },
    );
  }, [
    certificateFilter,
    dateFrom,
    dateTo,
    eventFilter,
    registrationsWithRelations,
    searchTerm,
    statusFilter,
  ]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    eventFilter !== 'all' ||
    certificateFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    if (eventFilter !== 'all') {
      params.set('event', eventFilter);
    }

    if (certificateFilter !== 'all') {
      params.set('certificate', certificateFilter);
    }

    if (dateFrom) {
      params.set('from', dateFrom);
    }

    if (dateTo) {
      params.set('to', dateTo);
    }

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
        {
          scroll: false,
        },
      );
    }
  }, [filterParams, pathname, router, searchParams]);

  const eventFilterOptions = useMemo(
    () =>
      [...events]
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((event) => ({ id: event.id, title: event.title })),
    [events],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inscrições recentes</CardTitle>
          <CardDescription>
            Filtro por status e eventos com lotação em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar inscrição
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Participante, e-mail, evento, local, tipo ou status"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data inicial da inscrição
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data final da inscrição
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Evento
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                value={eventFilter}
                onChange={(event) => setEventFilter(event.target.value)}
              >
                <option value="all">Todos os eventos</option>
                {eventFilterOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
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
                Ativo
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'CANCELADO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('CANCELADO')}
              >
                Cancelado
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'CONCLUIDO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('CONCLUIDO')}
              >
                Concluído
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={certificateFilter === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setCertificateFilter('all')}
              >
                Certificado: todos
              </Button>
              <Button
                type="button"
                variant={
                  certificateFilter === 'approved' ? 'default' : 'secondary'
                }
                size="sm"
                onClick={() => setCertificateFilter('approved')}
              >
                Certificado aprovado
              </Button>
              <Button
                type="button"
                variant={
                  certificateFilter === 'pending' ? 'default' : 'secondary'
                }
                size="sm"
                onClick={() => setCertificateFilter('pending')}
              >
                Certificado pendente
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setEventFilter('all');
                    setCertificateFilter('all');
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
            <p>Nenhuma inscrição encontrada.</p>
          ) : null}

          {filteredRegistrations.map(({ registration, user, event }) => (
            <div
              key={registration.id}
              className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-academy-text">
                  {user?.name ?? registration.participantId} ·{' '}
                  {event?.title ?? registration.eventId}
                </p>
                <p className="mt-1 text-slate-600">
                  Inscrição em{' '}
                  {formatDateOnlyUTC(registration.registrationDate)} · Presença{' '}
                  {registration.attendancePercent.toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Certificado:{' '}
                  {registration.approvedForCertificate
                    ? 'aprovado'
                    : 'pendente'}
                </p>
              </div>
              <Badge tone={statusTone(registration.status)}>
                {registration.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminRegistrationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminRegistrationsPageContent />
    </Suspense>
  );
}

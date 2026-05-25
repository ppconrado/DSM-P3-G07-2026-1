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
import { fetchSession } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { useAutoHideMessage } from '@/lib/useAutoHideMessage';
import type { EventRecord } from '@/lib/domain';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function statusTone(status: EventRecord['status']) {
  if (status === 'ATIVA') return 'success';
  if (status === 'CRIANDO') return 'warning';
  return 'neutral';
}

function ParticipantEventsPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [speakersMap, setSpeakersMap] = useState<Record<string, any>>({});
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | EventRecord['status']
  >(() => {
    const value = searchParams.get('status');
    if (value === 'ATIVA' || value === 'CRIANDO' || value === 'CANCELADA') {
      return value;
    }

    return 'all';
  });
  const [typeFilter, setTypeFilter] = useState(
    () => searchParams.get('type') ?? 'all',
  );
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('from') ?? '',
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeringFor, setRegisteringFor] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<{
    eventId: string;
    message: string;
  } | null>(null);
  const { addToast } = useToast();

  useAutoHideMessage(registrationError?.message ?? null, () => {
    setRegistrationError(null);
  });

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const [data, speakers, registrations, session] = await Promise.all([
          apiFetch<EventRecord[]>('/events'),
          apiFetch<any[]>('/speakers'),
          apiFetch<any[]>('/registrations'),
          fetchSession(),
        ]);

        const speakersById: Record<string, any> = {};
        for (const s of speakers) speakersById[s.id] = s;

        const myRegs = (registrations || []).filter(
          (r: any) => r.participantId === session.user.id,
        );

        const regIds = new Set(myRegs.map((r: any) => r.eventId));

        if (!active) {
          return;
        }

        setEvents(data);
        setSpeakersMap(speakersById);
        setRegisteredEventIds(regIds);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar eventos.',
        );
        addToast(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar eventos.',
          'error',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, [addToast]);

  async function handleRegister(eventId: string) {
    setRegisteringFor(eventId);
    setError(null);
    setRegistrationError(null);
    try {
      const session = await fetchSession();
      await apiFetch('/registrations', {
        method: 'POST',
        json: { participantId: session.user.id, eventId },
      });

      // Optimistically update registered set and show feedback
      setRegisteredEventIds((prev) => new Set(prev).add(eventId));
      addToast('Inscrição realizada com sucesso.', 'success');
      // Optionally refresh events if something else changed server-side
      // const updated = await apiFetch<EventRecord[]>('/events');
      // setEvents(updated);
    } catch (err) {
      setRegistrationError({
        eventId,
        message:
          err instanceof Error
            ? err.message
            : 'Erro ao inscrever-se no evento.',
      });
    } finally {
      setRegisteringFor(null);
    }
  }

  const eventTypes = useMemo(
    () =>
      [...new Set(events.map((event) => event.type).filter(Boolean))].sort(),
    [events],
  );

  const visibleEvents = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return events
      .filter((event) => event.status !== 'CANCELADA')
      .filter((event) => {
        if (statusFilter !== 'all' && event.status !== statusFilter) {
          return false;
        }

        if (typeFilter !== 'all' && event.type !== typeFilter) {
          return false;
        }

        const startDateOnly = event.startDate.slice(0, 10);
        if (dateFrom && startDateOnly < dateFrom) {
          return false;
        }

        if (dateTo && startDateOnly > dateTo) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const speakerText = Array.isArray(event.speakerIds)
          ? event.speakerIds
              .map((speakerId) => speakersMap[speakerId])
              .filter(Boolean)
              .map((speaker) =>
                [speaker.name, speaker.email, speaker.institution, speaker.bio]
                  .filter(Boolean)
                  .join(' '),
              )
              .join(' ')
          : '';

        const searchableText = normalizeSearchText(
          [
            event.title,
            event.description ?? '',
            event.location,
            event.type,
            event.status,
            formatDateOnlyUTC(event.startDate),
            formatDateOnlyUTC(event.endDate),
            String(event.capacity ?? ''),
            speakerText,
          ].join(' '),
        );

        return searchableText.includes(normalizedSearchTerm);
      })
      .sort(
        (left, right) =>
          new Date(left.startDate).getTime() -
          new Date(right.startDate).getTime(),
      );
  }, [
    dateFrom,
    dateTo,
    events,
    searchTerm,
    speakersMap,
    statusFilter,
    typeFilter,
  ]);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    return params;
  }, [dateFrom, dateTo, searchTerm, statusFilter, typeFilter]);

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
    const active = events.filter((event) => event.status === 'ATIVA').length;
    const created = events.filter((event) => event.status === 'CRIANDO').length;
    const registered = visibleEvents.filter((event) =>
      registeredEventIds.has(event.id),
    ).length;

    return { active, created, registered };
  }, [events, registeredEventIds, visibleEvents]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Eventos disponíveis</CardTitle>
          <CardDescription>
            Explore e Inscreva-se em eventos utilizando, filtros por tipo, data
            e status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Eventos ativos
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.active}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Em criação
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {stats.created}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Visíveis nesta busca
              </p>
              <p className="mt-1 text-2xl font-semibold text-academy-text">
                {visibleEvents.length}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar eventos
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Título, local, palestrante, tipo, descrição"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                >
                  <option value="all">Todos</option>
                  <option value="ATIVA">Ativos</option>
                  <option value="CRIANDO">Em criação</option>
                  <option value="CANCELADA">Cancelados</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tipo
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
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
                Todos os status
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'ATIVA' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('ATIVA')}
              >
                Ativos
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'CRIANDO' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('CRIANDO')}
              >
                Em criação
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </div>

          {!loading && !error && visibleEvents.length === 0 ? (
            <p>Nenhum evento disponível no momento.</p>
          ) : null}

          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="space-y-3 rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-academy-text">
                    {event.title}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {formatDateOnlyUTC(event.startDate)} até{' '}
                    {formatDateOnlyUTC(event.endDate)} · {event.location} ·{' '}
                    {event.type}
                  </p>
                  {event.description ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-600">
                    Capacidade: {event.capacity ?? '—'}
                  </p>

                  {Array.isArray(event.speakerIds) &&
                  event.speakerIds.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium">Palestrantes:</p>
                      {event.speakerIds.map((sid) => {
                        const sp = speakersMap[sid];
                        if (!sp) return null;
                        return (
                          <div key={sid} className="text-sm text-slate-700">
                            <div className="font-semibold">{sp.name}</div>
                            <div className="text-xs">
                              {sp.email} · {sp.institution ?? ''}
                            </div>
                            {sp.bio ? (
                              <div className="text-xs">{sp.bio}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                  {registeredEventIds.has(event.id) ? (
                    <Button size="sm" variant="default" disabled>
                      Inscrito
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegister(event.id)}
                      disabled={registeringFor !== null}
                    >
                      {registeringFor === event.id
                        ? 'Inscrevendo...'
                        : 'Inscrever'}
                    </Button>
                  )}
                </div>
              </div>

              {registrationError?.eventId === event.id ? (
                <p
                  className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  aria-live="polite"
                >
                  {registrationError.message}
                </p>
              ) : null}
            </div>
          ))}

          {/* feedback via toasts */}

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

export default function ParticipantEventsPage() {
  return (
    <Suspense fallback={null}>
      <ParticipantEventsPageContent />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
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
import type { EventRecord, EventSessionRecord } from '@/lib/domain';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function AdminSessionsPageContent() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [sessionsByEvent, setSessionsByEvent] = useState<
    Record<string, EventSessionRecord[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | EventRecord['status']
  >(() => {
    const value = searchParams.get('status');
    if (
      value === 'CRIANDO' ||
      value === 'ATIVA' ||
      value === 'ENCERRADA' ||
      value === 'CANCELADA'
    ) {
      return value;
    }

    return 'all';
  });
  const [sessionFilter, setSessionFilter] = useState<
    'all' | 'with-sessions' | 'without-sessions'
  >(() => {
    const value = searchParams.get('session');
    if (value === 'with-sessions' || value === 'without-sessions') {
      return value;
    }

    return 'all';
  });
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('from') ?? '',
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '');

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionEventId, setSessionEventId] = useState<string | null>(null);
  const [sessionFormOpenForEventId, setSessionFormOpenForEventId] = useState<
    string | null
  >(null);
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');

  function resetSessionForm() {
    setEditingSessionId(null);
    setSessionEventId(null);
    setSessionDate('');
    setStartTime('');
    setEndTime('');
    setRoom('');
    setFormError(null);
  }

  function openCreateSessionForm(eventId: string) {
    resetSessionForm();
    setSessionEventId(eventId);
    setSessionFormOpenForEventId(eventId);
  }

  function openEditSessionForm(eventId: string, session: EventSessionRecord) {
    setEditingSessionId(session.id);
    setSessionEventId(eventId);
    setSessionDate(session.sessionDate.slice(0, 10));
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setRoom(session.room ?? '');
    setFormError(null);
    setSuccessMessage(null);
    setSessionFormOpenForEventId(eventId);
  }

  const loadData = useCallback(async () => {
    const eventList = await apiFetch<EventRecord[]>('/events');
    const sessionsByEventId = await Promise.all(
      eventList.map(async (event) => ({
        eventId: event.id,
        sessions: await apiFetch<EventSessionRecord[]>(
          `/events/${event.id}/sessions`,
        ),
      })),
    );

    setEvents(eventList);
    setSessionsByEvent(
      sessionsByEventId.reduce<Record<string, EventSessionRecord[]>>(
        (accumulator, item) => {
          accumulator[item.eventId] = item.sessions;
          return accumulator;
        },
        {},
      ),
    );
  }, []);

  useEffect(() => {
    void loadData()
      .catch((loadError) => {
        addToast(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar sessões.',
          'error',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [addToast, loadData]);

  async function refreshData() {
    await loadData();
  }

  async function handleSubmitSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionEventId) {
      return;
    }

    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        sessionDate,
        startTime,
        endTime,
        room: room || undefined,
      };

      if (editingSessionId) {
        await apiFetch(
          `/events/${sessionEventId}/sessions/${editingSessionId}`,
          {
            method: 'PUT',
            json: payload,
          },
        );
      } else {
        await apiFetch(`/events/${sessionEventId}/sessions`, {
          method: 'POST',
          json: payload,
        });
      }

      setSuccessMessage(
        editingSessionId
          ? 'Sessão atualizada com sucesso.'
          : 'Sessão criada com sucesso.',
      );
      addToast(
        editingSessionId
          ? 'Sessão atualizada com sucesso.'
          : 'Sessão criada com sucesso.',
        'success',
      );
      resetSessionForm();
      setSessionFormOpenForEventId(null);
      await refreshData();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar sessão.',
      );
      addToast(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar sessão.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession(eventId: string, sessionId: string) {
    setFormError(null);
    setSuccessMessage(null);

    if (!window.confirm('Excluir esta sessão?')) {
      return;
    }

    try {
      await apiFetch(`/events/${eventId}/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (editingSessionId === sessionId) {
        resetSessionForm();
      }

      setSuccessMessage('Sessão excluída com sucesso.');
      addToast('Sessão excluída com sucesso.', 'success');
      await refreshData();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir sessão.',
      );
      addToast(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir sessão.',
        'error',
      );
    }
  }

  const orderedEvents = useMemo(
    () =>
      [...events].sort((left, right) => left.title.localeCompare(right.title)),
    [events],
  );

  const hasDateRangeFilter = dateFrom !== '' || dateTo !== '';

  const sessionsWithinDateRangeByEvent = useMemo(() => {
    return Object.entries(sessionsByEvent).reduce<
      Record<string, EventSessionRecord[]>
    >((accumulator, [eventId, sessions]) => {
      accumulator[eventId] = sessions.filter((session) => {
        const sessionDate = session.sessionDate.slice(0, 10);

        if (dateFrom && sessionDate < dateFrom) {
          return false;
        }

        if (dateTo && sessionDate > dateTo) {
          return false;
        }

        return true;
      });

      return accumulator;
    }, {});
  }, [dateFrom, dateTo, sessionsByEvent]);

  const filteredEvents = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return orderedEvents.filter((event) => {
      const sessions = sessionsByEvent[event.id] ?? [];
      const sessionsWithinDateRange =
        sessionsWithinDateRangeByEvent[event.id] ?? [];
      const sessionsForDateFiltering = hasDateRangeFilter
        ? sessionsWithinDateRange
        : sessions;

      if (statusFilter !== 'all' && event.status !== statusFilter) {
        return false;
      }

      if (
        sessionFilter === 'with-sessions' &&
        sessionsForDateFiltering.length === 0
      ) {
        return false;
      }

      if (
        sessionFilter === 'without-sessions' &&
        sessionsForDateFiltering.length > 0
      ) {
        return false;
      }

      if (hasDateRangeFilter && sessionsWithinDateRange.length === 0) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchableText = normalizeSearchText(
        [
          event.title,
          event.description ?? '',
          event.location,
          event.type,
          event.status,
          formatDateOnlyUTC(event.startDate),
          formatDateOnlyUTC(event.endDate),
          String(event.capacity),
          String(event.certificateRequiredPercent ?? ''),
          sessions
            .map((session) =>
              [
                formatDateOnlyUTC(session.sessionDate),
                session.startTime,
                session.endTime,
                session.room ?? '',
              ].join(' '),
            )
            .join(' '),
        ].join(' '),
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [
    hasDateRangeFilter,
    orderedEvents,
    searchTerm,
    sessionFilter,
    sessionsByEvent,
    sessionsWithinDateRangeByEvent,
    statusFilter,
  ]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    sessionFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const sessionsFilterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    if (sessionFilter !== 'all') {
      params.set('session', sessionFilter);
    }

    if (dateFrom) {
      params.set('from', dateFrom);
    }

    if (dateTo) {
      params.set('to', dateTo);
    }

    return params;
  }, [dateFrom, dateTo, searchTerm, sessionFilter, statusFilter]);

  useEffect(() => {
    const nextQueryString = sessionsFilterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [pathname, router, searchParams, sessionsFilterParams]);

  const statusFilterOptions: Array<{
    value: 'all' | EventRecord['status'];
    label: string;
    count: number;
  }> = [
    { value: 'all', label: 'Todos', count: orderedEvents.length },
    {
      value: 'CRIANDO',
      label: 'Criando',
      count: orderedEvents.filter((event) => event.status === 'CRIANDO').length,
    },
    {
      value: 'ATIVA',
      label: 'Ativa',
      count: orderedEvents.filter((event) => event.status === 'ATIVA').length,
    },
    {
      value: 'ENCERRADA',
      label: 'Encerrada',
      count: orderedEvents.filter((event) => event.status === 'ENCERRADA')
        .length,
    },
    {
      value: 'CANCELADA',
      label: 'Cancelada',
      count: orderedEvents.filter((event) => event.status === 'CANCELADA')
        .length,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sessões por evento</CardTitle>
          <CardDescription>
            Crie, edite e exclua sessões diretamente nos cards dos eventos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar evento ou sessão
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Título, local, sala, data ou horário"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data inicial da sessão
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data final da sessão
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {statusFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      statusFilter === option.value ? 'default' : 'secondary'
                    }
                    size="sm"
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label} ({option.count})
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={sessionFilter === 'all' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSessionFilter('all')}
                >
                  Todas as sessões
                </Button>
                <Button
                  type="button"
                  variant={
                    sessionFilter === 'with-sessions' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setSessionFilter('with-sessions')}
                >
                  Com sessões
                </Button>
                <Button
                  type="button"
                  variant={
                    sessionFilter === 'without-sessions'
                      ? 'default'
                      : 'secondary'
                  }
                  size="sm"
                  onClick={() => setSessionFilter('without-sessions')}
                >
                  Sem sessões
                </Button>

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSessionFilter('all');
                      setDateFrom('');
                      setDateTo('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {loading ? <p>Carregando sessões...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}
          {formError ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {formError}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          {!loading && !error && filteredEvents.length === 0 ? (
            <p>Nenhum evento encontrado.</p>
          ) : null}

          {filteredEvents.map((event) => {
            const allSessions = sessionsByEvent[event.id] ?? [];
            const sessions = hasDateRangeFilter
              ? (sessionsWithinDateRangeByEvent[event.id] ?? [])
              : allSessions;
            const isFormOpen = sessionFormOpenForEventId === event.id;

            return (
              <div
                key={event.id}
                className="rounded-3xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-academy-text">
                      {event.title}
                    </p>
                    <p className="text-slate-600">
                      {event.location} · {event.type} · Capacidade{' '}
                      {event.capacity}
                    </p>
                    <p className="text-xs text-slate-500">
                      Vigência: {formatDateOnlyUTC(event.startDate)} até{' '}
                      {formatDateOnlyUTC(event.endDate)}
                    </p>
                    {event.description ? (
                      <p className="mt-1 text-slate-500">{event.description}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        event.status === 'ATIVA'
                          ? 'success'
                          : event.status === 'CRIANDO'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {event.status}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        isFormOpen
                          ? setSessionFormOpenForEventId(null)
                          : openCreateSessionForm(event.id)
                      }
                    >
                      {isFormOpen ? (
                        <>
                          <X className="h-4 w-4" />
                          Fechar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Nova sessão
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isFormOpen ? (
                  <form
                    className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    onSubmit={handleSubmitSession}
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {editingSessionId ? 'Editar sessão' : 'Criar sessão'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Data da sessão
                        <Input
                          type="date"
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Sala
                        <Input
                          value={room}
                          onChange={(e) => setRoom(e.target.value)}
                          placeholder="Sala 101"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Horário inicial
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Horário final
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" disabled={saving}>
                        <Plus className="h-4 w-4" />
                        {saving
                          ? 'Salvando...'
                          : editingSessionId
                            ? 'Atualizar sessão'
                            : 'Criar sessão'}
                      </Button>
                      {editingSessionId ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={resetSessionForm}
                        >
                          Cancelar edição
                        </Button>
                      ) : null}
                    </div>
                  </form>
                ) : null}

                <div className="mt-4 space-y-2">
                  {sessions.length === 0 ? (
                    <p className="text-slate-600">
                      Sem sessões cadastradas para este evento.
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <span className="font-medium text-slate-800">
                            {formatDateOnlyUTC(session.sessionDate)} ·{' '}
                            {session.startTime} às {session.endTime}
                          </span>
                          <p className="text-sm text-slate-600">
                            {session.room ?? 'Sem sala'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="default">Sessão</Badge>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            asChild
                          >
                            <Link
                              href={`/dashboard/admin/attendance?eventId=${event.id}&sessionId=${session.id}`}
                            >
                              Presenças
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openEditSessionForm(event.id, session)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteSession(event.id, session.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminSessionsPage() {
  return (
    <Suspense fallback={null}>
      <AdminSessionsPageContent />
    </Suspense>
  );
}

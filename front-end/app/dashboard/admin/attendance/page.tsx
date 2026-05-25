'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { formatDateOnlyUTC } from '@/lib/date';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useAutoHideMessage } from '@/lib/useAutoHideMessage';
import { fetchSession } from '@/lib/auth';
import type {
  AttendanceRecord,
  EventRecord,
  EventSessionRecord,
  RegistrationRecord,
  UserRecord,
} from '@/lib/domain';

function formatTimeRange(session: EventSessionRecord) {
  return `${session.startTime} às ${session.endTime}`;
}

function buildAttendanceHref(
  eventId: string,
  sessionId: string,
  baseParams?: URLSearchParams,
) {
  const params = new URLSearchParams(baseParams?.toString() ?? '');
  params.set('eventId', eventId);
  params.set('sessionId', sessionId);

  return `/dashboard/admin/attendance?${params.toString()}`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function AdminAttendancePageContent() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [sessionsByEvent, setSessionsByEvent] = useState<
    Record<string, EventSessionRecord[]>
  >({});
  const [attendancesByRegistration, setAttendancesByRegistration] = useState<
    Record<string, AttendanceRecord[]>
  >({});
  const [adminUserId, setAdminUserId] = useState('');
  const [editing, setEditing] = useState<{
    registrationId: string;
    eventSessionId: string;
    attendanceId?: string;
    present: boolean;
    checkInAt: string;
    checkOutAt: string;
    notes: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [presenceDrafts, setPresenceDrafts] = useState<Record<string, boolean>>(
    {},
  );

  useAutoHideMessage(successMessage, () => setSuccessMessage(null));

  const [sessionSearchTerm, setSessionSearchTerm] = useState(
    () => searchParams.get('sessionQ') ?? '',
  );
  const [eventStatusFilter, setEventStatusFilter] = useState<
    'all' | EventRecord['status']
  >(() => {
    const value = searchParams.get('eventStatus');
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
  const [sessionDateFrom, setSessionDateFrom] = useState(
    () => searchParams.get('sessionDateFrom') ?? '',
  );
  const [sessionDateTo, setSessionDateTo] = useState(
    () => searchParams.get('sessionDateTo') ?? '',
  );
  const [participantSearchTerm, setParticipantSearchTerm] = useState(
    () => searchParams.get('participantQ') ?? '',
  );
  const [presenceFilter, setPresenceFilter] = useState<
    'all' | 'present' | 'pending'
  >(() => {
    const value = searchParams.get('presence');
    if (value === 'present' || value === 'pending') {
      return value;
    }

    return 'all';
  });
  const selectedEventId = searchParams.get('eventId');
  const selectedSessionId = searchParams.get('sessionId');

  function clearSelectedSession() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('eventId');
    params.delete('sessionId');

    const nextQueryString = params.toString();

    router.replace(
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
      { scroll: false },
    );
  }

  function handleSessionPickerToggle(eventId: string, sessionId: string) {
    if (selectedEventId === eventId && selectedSessionId === sessionId) {
      clearSelectedSession();
      return;
    }

    const nextHref = buildAttendanceHref(
      eventId,
      sessionId,
      attendanceFilterParams,
    );
    router.replace(nextHref, { scroll: false });
  }

  const loadAttendance = useCallback(async () => {
    try {
      const [session, registrationList, userList, eventList] =
        await Promise.all([
          fetchSession(),
          apiFetch<RegistrationRecord[]>('/registrations'),
          apiFetch<UserRecord[]>('/users?includeInactive=true'),
          apiFetch<EventRecord[]>('/events'),
        ]);

      const sessionsByEventId = await Promise.all(
        eventList.map(async (event) => ({
          eventId: event.id,
          sessions: await apiFetch<EventSessionRecord[]>(
            `/events/${event.id}/sessions`,
          ),
        })),
      );

      const attendancesByRegistrationId = await Promise.all(
        registrationList.map(async (registration) => ({
          registrationId: registration.id,
          attendances: await apiFetch<AttendanceRecord[]>(
            `/registrations/${registration.id}/attendance`,
          ),
        })),
      );

      setAdminUserId(session.user.id);
      setRegistrations(registrationList);
      setUsers(userList);
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
      setAttendancesByRegistration(
        attendancesByRegistrationId.reduce<Record<string, AttendanceRecord[]>>(
          (accumulator, item) => {
            accumulator[item.registrationId] = item.attendances;
            return accumulator;
          },
          {},
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar presença.',
      );
      addToast(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar presença.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const attendanceRows = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return registrations.map((registration) => {
      const user = usersById.get(registration.participantId);
      const event = eventsById.get(registration.eventId);
      const sessions = sessionsByEvent[event?.id ?? ''] ?? [];
      const attendances = attendancesByRegistration[registration.id] ?? [];

      return { registration, user, event, sessions, attendances };
    });
  }, [
    attendancesByRegistration,
    events,
    registrations,
    sessionsByEvent,
    users,
  ]);

  const selectedSessionContext = useMemo(() => {
    if (selectedEventId && selectedSessionId) {
      const event = events.find((item) => item.id === selectedEventId) ?? null;
      const session = sessionsByEvent[selectedEventId]?.find(
        (item) => item.id === selectedSessionId,
      );

      if (event && session) {
        return { event, session };
      }
    }

    if (selectedSessionId) {
      for (const event of events) {
        const session = sessionsByEvent[event.id]?.find(
          (item) => item.id === selectedSessionId,
        );

        if (session) {
          return { event, session };
        }
      }
    }

    return null;
  }, [events, selectedEventId, selectedSessionId, sessionsByEvent]);

  const sessionPickerRows = useMemo(
    () =>
      events.map((event) => ({
        event,
        sessions: sessionsByEvent[event.id] ?? [],
      })),
    [events, sessionsByEvent],
  );

  const filteredSessionPickerRows = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(sessionSearchTerm.trim());

    return sessionPickerRows
      .map(({ event, sessions }) => {
        if (eventStatusFilter !== 'all' && event.status !== eventStatusFilter) {
          return { event, sessions: [] as EventSessionRecord[] };
        }

        const filteredSessions = sessions.filter((session) => {
          const sessionDate = session.sessionDate.slice(0, 10);

          if (sessionDateFrom && sessionDate < sessionDateFrom) {
            return false;
          }

          if (sessionDateTo && sessionDate > sessionDateTo) {
            return false;
          }

          if (!normalizedSearchTerm) {
            return true;
          }

          const searchableText = normalizeSearchText(
            [
              event.title,
              event.location,
              event.type,
              formatDateOnlyUTC(session.sessionDate),
              session.startTime,
              session.endTime,
              session.room ?? '',
            ].join(' '),
          );

          return searchableText.includes(normalizedSearchTerm);
        });

        return { event, sessions: filteredSessions };
      })
      .filter(({ sessions }) => sessions.length > 0);
  }, [
    eventStatusFilter,
    sessionDateFrom,
    sessionDateTo,
    sessionPickerRows,
    sessionSearchTerm,
  ]);

  const selectedSessionRows = useMemo(() => {
    if (!selectedSessionContext) {
      return [];
    }

    const usersById = new Map(users.map((user) => [user.id, user]));
    const eventRegistrations = registrations.filter(
      (registration) =>
        registration.eventId === selectedSessionContext.event.id,
    );

    return eventRegistrations.map((registration) => {
      const user = usersById.get(registration.participantId);
      const attendance = attendancesByRegistration[registration.id]?.find(
        (item) => item.eventSessionId === selectedSessionContext.session.id,
      );

      return {
        registration,
        user,
        attendance,
      };
    });
  }, [attendancesByRegistration, registrations, selectedSessionContext, users]);

  const filteredSelectedSessionRows = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(
      participantSearchTerm.trim(),
    );

    return selectedSessionRows.filter(({ registration, user, attendance }) => {
      const checked = presenceDrafts[registration.id] ?? false;

      if (presenceFilter === 'present' && !checked) {
        return false;
      }

      if (presenceFilter === 'pending' && checked) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const searchableText = normalizeSearchText(
        [
          user?.name ?? '',
          user?.email ?? '',
          registration.participantId,
          attendance?.notes ?? '',
        ].join(' '),
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [
    participantSearchTerm,
    presenceDrafts,
    presenceFilter,
    selectedSessionRows,
  ]);

  const hasActiveSessionFilters =
    sessionSearchTerm.trim() !== '' ||
    eventStatusFilter !== 'all' ||
    sessionDateFrom !== '' ||
    sessionDateTo !== '';

  const hasActiveParticipantFilters =
    participantSearchTerm.trim() !== '' || presenceFilter !== 'all';

  const attendanceFilterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (sessionSearchTerm.trim()) {
      params.set('sessionQ', sessionSearchTerm.trim());
    }

    if (eventStatusFilter !== 'all') {
      params.set('eventStatus', eventStatusFilter);
    }

    if (sessionDateFrom) {
      params.set('sessionDateFrom', sessionDateFrom);
    }

    if (sessionDateTo) {
      params.set('sessionDateTo', sessionDateTo);
    }

    if (participantSearchTerm.trim()) {
      params.set('participantQ', participantSearchTerm.trim());
    }

    if (presenceFilter !== 'all') {
      params.set('presence', presenceFilter);
    }

    return params;
  }, [
    eventStatusFilter,
    participantSearchTerm,
    presenceFilter,
    sessionDateFrom,
    sessionDateTo,
    sessionSearchTerm,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(attendanceFilterParams.toString());

    if (selectedEventId) {
      params.set('eventId', selectedEventId);
    }

    if (selectedSessionId) {
      params.set('sessionId', selectedSessionId);
    }

    const nextQueryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [
    attendanceFilterParams,
    pathname,
    router,
    searchParams,
    selectedEventId,
    selectedSessionId,
  ]);

  const selectedSessionLabel = useMemo(() => {
    if (!selectedSessionContext) {
      return null;
    }
    return {
      eventTitle: selectedSessionContext.event.title,
      sessionDate: formatDateOnlyUTC(
        selectedSessionContext.session.sessionDate,
      ),
      startTime: selectedSessionContext.session.startTime,
      endTime: selectedSessionContext.session.endTime,
      room: selectedSessionContext.session.room ?? 'Sem sala',
    };
  }, [selectedSessionContext]);

  useEffect(() => {
    if (!selectedSessionContext) {
      setPresenceDrafts({});
      return;
    }

    setPresenceDrafts(
      Object.fromEntries(
        selectedSessionRows.map(({ registration, attendance }) => [
          registration.id,
          attendance?.present ?? false,
        ]),
      ),
    );
  }, [selectedSessionContext, selectedSessionRows]);

  function handleTogglePresenceDraft(registrationId: string, present: boolean) {
    setPresenceDrafts((current) => ({
      ...current,
      [registrationId]: present,
    }));
  }

  async function handleConcludeAttendances() {
    if (!selectedSessionContext || !adminUserId) {
      return;
    }

    if (selectedSessionRows.length === 0) {
      setFormError('Nenhuma inscrição encontrada para esta sessão.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      for (const row of selectedSessionRows) {
        const shouldBePresent = presenceDrafts[row.registration.id] ?? false;

        if (shouldBePresent) {
          const payload = {
            present: true,
            markedByUserId: adminUserId,
          };

          if (row.attendance) {
            await apiFetch(
              `/registrations/${row.registration.id}/attendance/${row.attendance.id}`,
              {
                method: 'PUT',
                json: payload,
              },
            );
          } else {
            await apiFetch(`/registrations/${row.registration.id}/attendance`, {
              method: 'POST',
              json: {
                ...payload,
                eventSessionId: selectedSessionContext.session.id,
              },
            });
          }
        } else if (row.attendance) {
          await apiFetch(
            `/registrations/${row.registration.id}/attendance/${row.attendance.id}`,
            {
              method: 'PUT',
              json: {
                present: false,
                markedByUserId: adminUserId,
              },
            },
          );
        }
      }

      setSuccessMessage('Presenças concluídas com sucesso.');
      addToast('Presenças concluídas com sucesso.', 'success');
      clearSelectedSession();
      await loadAttendance();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao concluir presenças.',
      );
      addToast(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao concluir presenças.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(registrationId: string, eventSessionId: string) {
    const attendance = attendancesByRegistration[registrationId]?.find(
      (item) => item.eventSessionId === eventSessionId,
    );

    setEditing({
      registrationId,
      eventSessionId,
      attendanceId: attendance?.id,
      present: attendance?.present ?? true,
      checkInAt: attendance?.checkInAt ? attendance.checkInAt.slice(0, 16) : '',
      checkOutAt: attendance?.checkOutAt
        ? attendance.checkOutAt.slice(0, 16)
        : '',
      notes: attendance?.notes ?? '',
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function cancelEditing() {
    setEditing(null);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSaveAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing || !adminUserId) {
      return;
    }

    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        present: editing.present,
        checkInAt: editing.checkInAt || undefined,
        checkOutAt: editing.checkOutAt || undefined,
        notes: editing.notes || undefined,
        markedByUserId: adminUserId,
      };

      if (editing.attendanceId) {
        await apiFetch(
          `/registrations/${editing.registrationId}/attendance/${editing.attendanceId}`,
          {
            method: 'PUT',
            json: payload,
          },
        );
      } else {
        await apiFetch(`/registrations/${editing.registrationId}/attendance`, {
          method: 'POST',
          json: {
            ...payload,
            eventSessionId: editing.eventSessionId,
          },
        });
      }

      cancelEditing();
      const successText = editing.attendanceId
        ? 'Presença atualizada com sucesso.'
        : 'Presença criada com sucesso.';
      setSuccessMessage(successText);
      addToast(successText, 'success');
      await loadAttendance();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar presença.',
      );
      addToast(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar presença.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAttendance(
    registrationId: string,
    attendanceId: string,
  ) {
    setFormError(null);
    setSuccessMessage(null);

    if (!window.confirm('Remover esta presença?')) {
      return;
    }

    try {
      await apiFetch(
        `/registrations/${registrationId}/attendance/${attendanceId}`,
        {
          method: 'DELETE',
          json: { markedByUserId: adminUserId },
        },
      );
      setSuccessMessage('Presença removida com sucesso.');
      addToast('Presença removida com sucesso.', 'success');
      await loadAttendance();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao remover presença.',
      );
      addToast(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao remover presença.',
        'error',
      );
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Marcação de presença</CardTitle>
              <CardDescription>
                Gerencie a marcação de presenças, para cálculo automático do
                percentual mínimo de participação.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {loading ? <p>Carregando presença...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-semibold text-academy-text">
                  Selecione a sessão
                </p>
                <p className="text-slate-500">
                  Clique na sessão do evento desejado. Marque os presentes e
                  aperte CONCLUIR PRESENÇAS.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Buscar sessão
                <Input
                  value={sessionSearchTerm}
                  onChange={(event) => setSessionSearchTerm(event.target.value)}
                  placeholder="Evento, sala, data ou horário"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Data inicial da sessão
                  <Input
                    type="date"
                    value={sessionDateFrom}
                    onChange={(event) => setSessionDateFrom(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Data final da sessão
                  <Input
                    type="date"
                    value={sessionDateTo}
                    onChange={(event) => setSessionDateTo(event.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    eventStatusFilter === 'all' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setEventStatusFilter('all')}
                >
                  Todos os status
                </Button>
                <Button
                  type="button"
                  variant={
                    eventStatusFilter === 'CRIANDO' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setEventStatusFilter('CRIANDO')}
                >
                  Criando
                </Button>
                <Button
                  type="button"
                  variant={
                    eventStatusFilter === 'ATIVA' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setEventStatusFilter('ATIVA')}
                >
                  Ativa
                </Button>
                <Button
                  type="button"
                  variant={
                    eventStatusFilter === 'ENCERRADA' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setEventStatusFilter('ENCERRADA')}
                >
                  Encerrada
                </Button>
                <Button
                  type="button"
                  variant={
                    eventStatusFilter === 'CANCELADA' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setEventStatusFilter('CANCELADA')}
                >
                  Cancelada
                </Button>

                {hasActiveSessionFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSessionSearchTerm('');
                      setEventStatusFilter('all');
                      setSessionDateFrom('');
                      setSessionDateTo('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>

            {filteredSessionPickerRows.length === 0 ? (
              <p className="mt-4 text-slate-500">Nenhuma sessão disponível.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {filteredSessionPickerRows.map(({ event, sessions }) => (
                  <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-academy-text">
                          {event.title}
                        </p>
                        <p className="text-slate-500">
                          {sessions.length}{' '}
                          {sessions.length === 1 ? 'sessão' : 'sessões'}
                        </p>
                      </div>
                      <Badge tone="neutral">Escolha uma sessão</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {sessions.length === 0 ? (
                        <p className="text-slate-500">
                          Este evento ainda não possui sessões.
                        </p>
                      ) : (
                        sessions.map((session) => {
                          const active =
                            selectedSessionContext?.session.id === session.id &&
                            selectedSessionContext?.event.id === event.id;

                          return (
                            <Button
                              key={session.id}
                              type="button"
                              variant={active ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() =>
                                handleSessionPickerToggle(event.id, session.id)
                              }
                            >
                              {formatDateOnlyUTC(session.sessionDate)} ·{' '}
                              {session.startTime} às {session.endTime} ·{' '}
                              {session.room ?? 'Sem sala'}
                            </Button>
                          );
                        })
                      )}
                    </div>

                    {selectedSessionContext?.event.id === event.id ? (
                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-academy-text">
                              Lista de participantes da sessão
                            </p>
                            <p className="text-slate-500">
                              {selectedSessionLabel
                                ? `${selectedSessionLabel.eventTitle} · ${selectedSessionLabel.sessionDate} · ${selectedSessionLabel.startTime} às ${selectedSessionLabel.endTime} · ${selectedSessionLabel.room}`
                                : 'Sessão selecionada'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={handleConcludeAttendances}
                              disabled={saving}
                            >
                              <Plus className="h-4 w-4" />
                              {saving ? 'Concluindo...' : 'Concluir presenças'}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={clearSelectedSession}
                            >
                              Fechar lista
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <label className="grid gap-2 text-sm font-medium text-slate-700">
                            Buscar participante
                            <Input
                              value={participantSearchTerm}
                              onChange={(event) =>
                                setParticipantSearchTerm(event.target.value)
                              }
                              placeholder="Nome, e-mail ou observação"
                            />
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={
                                presenceFilter === 'all'
                                  ? 'default'
                                  : 'secondary'
                              }
                              size="sm"
                              onClick={() => setPresenceFilter('all')}
                            >
                              Todos
                            </Button>
                            <Button
                              type="button"
                              variant={
                                presenceFilter === 'present'
                                  ? 'default'
                                  : 'secondary'
                              }
                              size="sm"
                              onClick={() => setPresenceFilter('present')}
                            >
                              Presentes
                            </Button>
                            <Button
                              type="button"
                              variant={
                                presenceFilter === 'pending'
                                  ? 'default'
                                  : 'secondary'
                              }
                              size="sm"
                              onClick={() => setPresenceFilter('pending')}
                            >
                              Pendentes
                            </Button>

                            {hasActiveParticipantFilters ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setParticipantSearchTerm('');
                                  setPresenceFilter('all');
                                }}
                              >
                                Limpar filtros
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        {filteredSelectedSessionRows.length === 0 ? (
                          <p className="mt-4 text-slate-500">
                            Nenhum participante encontrado com os filtros
                            atuais.
                          </p>
                        ) : (
                          <div className="mt-4 grid gap-3">
                            {filteredSelectedSessionRows.map(
                              ({ registration, user, attendance }) => {
                                const checked =
                                  presenceDrafts[registration.id] ?? false;

                                return (
                                  <div
                                    key={registration.id}
                                    className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                      checked={checked}
                                      onChange={(event) =>
                                        handleTogglePresenceDraft(
                                          registration.id,
                                          event.target.checked,
                                        )
                                      }
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                          <p className="font-semibold text-academy-text">
                                            {user?.name ??
                                              registration.participantId}
                                          </p>
                                          <p className="text-slate-500">
                                            {user?.email ??
                                              'E-mail não informado'}
                                          </p>
                                        </div>
                                        <Badge
                                          tone={checked ? 'success' : 'neutral'}
                                        >
                                          {checked ? 'Presente' : 'Pendente'}
                                        </Badge>
                                      </div>

                                      {attendance?.notes ? (
                                        <p className="mt-2 text-slate-500">
                                          {attendance.notes}
                                        </p>
                                      ) : null}

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            handleTogglePresenceDraft(
                                              registration.id,
                                              !checked,
                                            )
                                          }
                                        >
                                          <Pencil className="h-4 w-4" />
                                          {checked ? 'Desmarcar' : 'Marcar'}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            startEditing(
                                              registration.id,
                                              selectedSessionContext.session.id,
                                            )
                                          }
                                        >
                                          Ajuste manual
                                        </Button>
                                      </div>

                                      {editing?.registrationId ===
                                      registration.id ? (
                                        <form
                                          className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                                          onSubmit={handleSaveAttendance}
                                        >
                                          <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                              <p className="font-semibold text-academy-text">
                                                Ajuste manual deste participante
                                              </p>
                                              <p className="text-slate-500">
                                                {user?.name ??
                                                  registration.participantId}
                                                {user?.email
                                                  ? ` · ${user.email}`
                                                  : ''}
                                              </p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              onClick={cancelEditing}
                                            >
                                              Cancelar
                                            </Button>
                                          </div>

                                          <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="grid gap-2 text-sm font-medium text-slate-700">
                                              Presença
                                              <select
                                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                                                value={
                                                  editing.present
                                                    ? 'true'
                                                    : 'false'
                                                }
                                                onChange={(event) =>
                                                  setEditing({
                                                    ...editing,
                                                    present:
                                                      event.target.value ===
                                                      'true',
                                                  })
                                                }
                                              >
                                                <option value="true">
                                                  Presente
                                                </option>
                                                <option value="false">
                                                  Ausente
                                                </option>
                                              </select>
                                            </label>
                                            <label className="grid gap-2 text-sm font-medium text-slate-700">
                                              Check-in
                                              <Input
                                                type="datetime-local"
                                                value={editing.checkInAt}
                                                onChange={(event) =>
                                                  setEditing({
                                                    ...editing,
                                                    checkInAt:
                                                      event.target.value,
                                                  })
                                                }
                                              />
                                            </label>
                                            <label className="grid gap-2 text-sm font-medium text-slate-700">
                                              Check-out
                                              <Input
                                                type="datetime-local"
                                                value={editing.checkOutAt}
                                                onChange={(event) =>
                                                  setEditing({
                                                    ...editing,
                                                    checkOutAt:
                                                      event.target.value,
                                                  })
                                                }
                                              />
                                            </label>
                                            <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                                              Observações
                                              <Input
                                                value={editing.notes}
                                                onChange={(event) =>
                                                  setEditing({
                                                    ...editing,
                                                    notes: event.target.value,
                                                  })
                                                }
                                              />
                                            </label>
                                          </div>

                                          {formError ? (
                                            <p
                                              className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700"
                                              role="alert"
                                            >
                                              {formError}
                                            </p>
                                          ) : null}

                                          <div className="mt-4 flex flex-wrap gap-3">
                                            <Button
                                              type="submit"
                                              disabled={saving}
                                            >
                                              <Plus className="h-4 w-4" />
                                              {saving
                                                ? 'Salvando...'
                                                : editing.attendanceId
                                                  ? 'Atualizar presença'
                                                  : 'Criar presença'}
                                            </Button>
                                          </div>
                                        </form>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}

                        {formError ? (
                          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
                            {formError}
                          </p>
                        ) : null}

                        {successMessage ? (
                          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                            {successMessage}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminAttendancePage() {
  return (
    <>
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-8 text-sm text-slate-600">
              Carregando presença...
            </CardContent>
          </Card>
        }
      >
        <AdminAttendancePageContent />
      </Suspense>
    </>
  );
}

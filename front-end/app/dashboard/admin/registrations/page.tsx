'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [editingRegistrationId, setEditingRegistrationId] = useState<
    string | null
  >(null);
  const [editingStatus, setEditingStatus] =
    useState<RegistrationRecord['status']>('ATIVO');
  const [editingApprovedForCertificate, setEditingApprovedForCertificate] =
    useState(false);

  const loadData = useCallback(async () => {
    try {
      const [registrationList, userList, eventList] = await Promise.all([
        apiFetch<RegistrationRecord[]>('/registrations'),
        apiFetch<UserRecord[]>('/users?includeInactive=true'),
        apiFetch<EventRecord[]>('/events'),
      ]);

      setRegistrations(registrationList);
      setUsers(userList);
      setEvents(eventList);
    } catch (loadError) {
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
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  const editingRegistration = useMemo(
    () =>
      registrationsWithRelations.find(
        ({ registration }) => registration.id === editingRegistrationId,
      ) ?? null,
    [editingRegistrationId, registrationsWithRelations],
  );

  function beginEditRegistration(registration: RegistrationRecord) {
    setEditingRegistrationId(registration.id);
    setEditingStatus(registration.status);
    setEditingApprovedForCertificate(registration.approvedForCertificate);
    setActionError(null);
  }

  function cancelRegistrationEdit() {
    setEditingRegistrationId(null);
    setActionError(null);
  }

  async function handleSaveRegistration(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingRegistrationId) {
      return;
    }

    setSavingRegistration(true);
    setActionError(null);

    try {
      await apiFetch(`/registrations/${editingRegistrationId}`, {
        method: 'PUT',
        json: {
          status: editingStatus,
          approvedForCertificate: editingApprovedForCertificate,
        },
      });

      cancelRegistrationEdit();
      addToast('Inscrição atualizada com sucesso.', 'success');
      await loadData();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao atualizar inscrição.';
      setActionError(message);
      addToast(message, 'error');
    } finally {
      setSavingRegistration(false);
    }
  }

  async function handleDeleteRegistration(registration: RegistrationRecord) {
    setActionError(null);

    if (
      !window.confirm(
        `Excluir a inscrição de ${registration.participantId} no evento ${registration.eventId}?`,
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/registrations/${registration.id}`, {
        method: 'DELETE',
      });

      if (editingRegistrationId === registration.id) {
        cancelRegistrationEdit();
      }

      addToast('Inscrição excluída com sucesso.', 'success');
      await loadData();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir inscrição.';
      setActionError(message);
      addToast(message, 'error');
    }
  }
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
          {actionError && !editingRegistration ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {actionError}
            </p>
          ) : null}

          {!loading && !error && filteredRegistrations.length === 0 ? (
            <p>Nenhuma inscrição encontrada.</p>
          ) : null}

          {filteredRegistrations.map(({ registration, user, event }) => (
            <div key={registration.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-academy-text">
                    {user?.name ?? registration.participantId} ·{' '}
                    {event?.title ?? registration.eventId}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Inscrição em{' '}
                    {formatDateOnlyUTC(registration.registrationDate)} ·
                    Presença {registration.attendancePercent.toFixed(0)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Certificado:{' '}
                    {registration.approvedForCertificate
                      ? 'aprovado'
                      : 'pendente'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(registration.status)}>
                    {registration.status}
                  </Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => beginEditRegistration(registration)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRegistration(registration)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>

              {editingRegistrationId === registration.id ? (
                <form
                  className="mt-4 rounded-3xl border border-slate-200 bg-white p-4"
                  onSubmit={handleSaveRegistration}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-academy-text">
                        Editar inscrição
                      </p>
                      <p className="text-xs text-slate-500">
                        {user?.name ?? registration.participantId} ·{' '}
                        {event?.title ?? 'Evento'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancelRegistrationEdit}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Status
                      <select
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                        value={editingStatus}
                        onChange={(event) =>
                          setEditingStatus(
                            event.target.value as RegistrationRecord['status'],
                          )
                        }
                      >
                        <option value="ATIVO">ATIVO</option>
                        <option value="CANCELADO">CANCELADO</option>
                        <option value="CONCLUIDO">CONCLUIDO</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Certificado
                      <select
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                        value={editingApprovedForCertificate ? 'yes' : 'no'}
                        onChange={(event) =>
                          setEditingApprovedForCertificate(
                            event.target.value === 'yes',
                          )
                        }
                      >
                        <option value="no">Pendente</option>
                        <option value="yes">Aprovado</option>
                      </select>
                    </label>
                  </div>

                  {actionError ? (
                    <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
                      {actionError}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" disabled={savingRegistration}>
                      {savingRegistration ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              ) : null}
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

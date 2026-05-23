'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { formatDateOnlyUTC } from '@/lib/date';
import { apiFetch } from '@/lib/api';
import { fetchSession } from '@/lib/auth';
import type { EventRecord, SpeakerRecord } from '@/lib/domain';

function statusTone(status: EventRecord['status']) {
  if (status === 'ATIVA') return 'success';
  if (status === 'CRIANDO') return 'warning';
  return 'neutral';
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function AdminEventsPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [certificateRequiredPercent, setCertificateRequiredPercent] =
    useState('75');
  const [status, setStatus] = useState<EventRecord['status']>('CRIANDO');
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);
  const [createdByAdminId, setCreatedByAdminId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function resetForm() {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setType('');
    setCapacity('');
    setCertificateRequiredPercent('75');
    setStatus('CRIANDO');
    setSelectedSpeakerIds([]);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function loadData() {
    try {
      const [eventData, speakerData] = await Promise.all([
        apiFetch<EventRecord[]>('/events'),
        apiFetch<SpeakerRecord[]>('/speakers'),
      ]);

      setEvents(eventData);
      setSpeakers(speakerData.filter((speaker) => speaker.isActive !== false));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar eventos.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    async function loadCreator() {
      try {
        const session = await fetchSession();
        setCreatedByAdminId(session.user.id);
      } catch {
        setCreatedByAdminId('');
      }
    }

    loadCreator();
  }, []);

  function beginEdit(eventRecord: EventRecord) {
    setEditingEventId(eventRecord.id);
    setTitle(eventRecord.title);
    setDescription(eventRecord.description ?? '');
    setStartDate(eventRecord.startDate.slice(0, 10));
    setEndDate(eventRecord.endDate.slice(0, 10));
    setLocation(eventRecord.location);
    setType(eventRecord.type);
    setCapacity(String(eventRecord.capacity));
    setCertificateRequiredPercent(
      String(eventRecord.certificateRequiredPercent ?? 75),
    );
    setStatus(eventRecord.status);
    setSelectedSpeakerIds(eventRecord.speakerIds ?? []);
    setFormError(null);
    setSuccessMessage(null);
  }

  function toggleSpeakerSelection(speakerId: string) {
    setSelectedSpeakerIds((current) =>
      current.includes(speakerId)
        ? current.filter((id) => id !== speakerId)
        : [...current, speakerId],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        title,
        description: description || undefined,
        startDate,
        endDate,
        location,
        type,
        capacity: Number(capacity),
        certificateRequiredPercent: Number(certificateRequiredPercent),
        ...(editingEventId ? { status } : {}),
        speakerIds: selectedSpeakerIds,
        ...(editingEventId ? {} : { createdByAdminId }),
      };

      if (editingEventId) {
        await apiFetch(`/events/${editingEventId}`, {
          method: 'PUT',
          json: payload,
        });
      } else {
        await apiFetch('/events', {
          method: 'POST',
          json: payload,
        });
      }

      resetForm();
      setSuccessMessage(
        editingEventId
          ? 'Evento atualizado com sucesso.'
          : 'Evento criado com sucesso.',
      );
      await loadData();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar evento.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setFormError(null);
    setSuccessMessage(null);

    const event = events.find((item) => item.id === eventId);
    if (!window.confirm(`Excluir o evento ${event?.title ?? eventId}?`)) {
      return;
    }

    try {
      await apiFetch(`/events/${eventId}`, { method: 'DELETE' });
      setSuccessMessage('Evento excluído com sucesso.');
      await loadData();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir evento.',
      );
    }
  }

  const orderedEvents = useMemo(
    () =>
      [...events].sort((left, right) => left.title.localeCompare(right.title)),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    return orderedEvents.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const speakerNames = (event.speakerIds ?? [])
        .map(
          (speakerId) =>
            speakers.find((speaker) => speaker.id === speakerId)?.name ?? '',
        )
        .join(' ');

      const searchableText = normalizeSearchText(
        [
          event.title,
          event.description ?? '',
          event.location,
          event.type,
          event.status,
          formatDateOnlyUTC(event.startDate),
          formatDateOnlyUTC(event.endDate),
          speakerNames,
        ].join(' '),
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [orderedEvents, searchTerm, speakers, statusFilter]);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  const eventsFilterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }

    return params;
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const nextQueryString = eventsFilterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [eventsFilterParams, pathname, router, searchParams]);

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
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEventId ? 'Editar evento' : 'Novo evento'}
            </CardTitle>
            <CardDescription>
              Criação e atualização de eventos com vínculo do ADMIN autenticado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Título
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Descrição
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Início
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Fim
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Local
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tipo
                <Input
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Capacidade
                  <Input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Percentual para certificado
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={certificateRequiredPercent}
                    onChange={(event) =>
                      setCertificateRequiredPercent(event.target.value)
                    }
                  />
                </label>
              </div>
              {editingEventId ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Status do evento
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as EventRecord['status'])
                    }
                  >
                    <option value="CRIANDO">CRIANDO</option>
                    <option value="ATIVA">ATIVA</option>
                    <option value="ENCERRADA">ENCERRADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                </label>
              ) : null}
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Palestrantes do evento
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-3 text-xs text-slate-500">
                    Selecione os palestrantes que participarão do evento.
                  </p>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {speakers.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum palestrante disponível.
                      </p>
                    ) : (
                      speakers.map((speaker) => {
                        const checked = selectedSpeakerIds.includes(speaker.id);

                        return (
                          <label
                            key={speaker.id}
                            className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${checked ? 'border-academy-primary bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-academy-primary focus:ring-academy-primary"
                              checked={checked}
                              onChange={() =>
                                toggleSpeakerSelection(speaker.id)
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">
                                {speaker.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {speaker.email}
                                {speaker.institution
                                  ? ` · ${speaker.institution}`
                                  : ''}
                              </p>
                              {speaker.bio ? (
                                <p className="mt-1 text-xs text-slate-600">
                                  {speaker.bio}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Selecionados: {selectedSpeakerIds.length}
                  </p>
                </div>
              </label>

              {formError ? (
                <p
                  className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}

              {successMessage ? (
                <p
                  className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  role="status"
                  aria-live="polite"
                >
                  {successMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving || !createdByAdminId}>
                  <Plus className="h-4 w-4" />
                  {saving
                    ? 'Salvando...'
                    : editingEventId
                      ? 'Atualizar evento'
                      : 'Criar evento'}
                </Button>
                {editingEventId ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar eventos</CardTitle>
            <CardDescription>
              Dados carregados da API com status, datas, tipo e lotação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Buscar evento
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Título, descrição, local, tipo, data ou palestrante"
                />
              </label>

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

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>

            {loading ? <p>Carregando eventos...</p> : null}
            {error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
                {error}
              </p>
            ) : null}

            {!loading && !error && filteredEvents.length === 0 ? (
              <p>Nenhum evento encontrado.</p>
            ) : null}

            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-academy-text">
                    {event.title}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {formatDateOnlyUTC(event.startDate)} até{' '}
                    {formatDateOnlyUTC(event.endDate)} · {event.location}
                  </p>
                  {event.description ? (
                    <p className="mt-2 text-slate-600">{event.description}</p>
                  ) : null}
                  {event.speakerIds && event.speakerIds.length > 0 ? (
                    <div className="mt-2 text-xs text-slate-600">
                      <span className="font-semibold">Palestrantes: </span>
                      {event.speakerIds
                        .map(
                          (speakerId) =>
                            speakers.find((speaker) => speaker.id === speakerId)
                              ?.name ?? speakerId,
                        )
                        .join(', ')}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => beginEdit(event)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={null}>
      <AdminEventsPageContent />
    </Suspense>
  );
}

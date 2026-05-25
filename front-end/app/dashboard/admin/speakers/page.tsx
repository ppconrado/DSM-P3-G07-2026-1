'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { formatDateOnlyUTC } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useAutoHideMessage } from '@/lib/useAutoHideMessage';
import type { EventRecord, SpeakerRecord } from '@/lib/domain';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export default function AdminSpeakersPage() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [viewMode, setViewMode] = useState<'active' | 'inactive' | 'all'>(
    () => {
      const value = searchParams.get('view');
      if (value === 'inactive' || value === 'all') {
        return value;
      }

      return 'active';
    },
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useAutoHideMessage(successMessage, () => setSuccessMessage(null));

  const filteredSpeakers = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm.trim());

    const visibleSpeakers =
      viewMode === 'active'
        ? speakers.filter((speaker) => speaker.isActive !== false)
        : viewMode === 'inactive'
          ? speakers.filter((speaker) => speaker.isActive === false)
          : speakers;

    if (!normalizedSearchTerm) {
      return visibleSpeakers;
    }

    return visibleSpeakers.filter((speaker) => {
      const eventsText = (speaker.eventIds ?? [])
        .map((eventId) => events.find((event) => event.id === eventId))
        .filter(Boolean)
        .map((event) => [event?.title, event?.location, event?.type].join(' '))
        .join(' ');

      const searchableText = normalizeSearchText(
        [
          speaker.name,
          speaker.email,
          speaker.institution ?? '',
          speaker.phone ?? '',
          speaker.bio ?? '',
          eventsText,
        ].join(' '),
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [events, searchTerm, speakers, viewMode]);

  const hasActiveFilters = searchTerm.trim() !== '' || viewMode !== 'active';

  const speakerFilterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    if (viewMode !== 'active') {
      params.set('view', viewMode);
    }

    return params;
  }, [searchTerm, viewMode]);

  useEffect(() => {
    const nextQueryString = speakerFilterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [pathname, router, searchParams, speakerFilterParams]);

  function resetForm() {
    setEditingSpeakerId(null);
    setName('');
    setEmail('');
    setInstitution('');
    setPhone('');
    setBio('');
    setSelectedEventIds([]);
    setFormError(null);
    setSuccessMessage(null);
  }

  const loadSpeakers = useCallback(async () => {
    try {
      const [speakerList, eventList] = await Promise.all([
        apiFetch<SpeakerRecord[]>('/speakers'),
        apiFetch<EventRecord[]>('/events'),
      ]);

      setSpeakers(speakerList);
      setEvents(eventList);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar palestrantes.',
      );
      addToast(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar palestrantes.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadSpeakers();
  }, [loadSpeakers]);

  function beginEdit(speaker: SpeakerRecord) {
    setEditingSpeakerId(speaker.id);
    setName(speaker.name);
    setEmail(speaker.email);
    setInstitution(speaker.institution ?? '');
    setPhone(speaker.phone ?? '');
    setBio(speaker.bio ?? '');
    setSelectedEventIds(speaker.eventIds ?? []);
    setFormError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleEventSelection(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  async function handleSubmitSpeaker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);
    const isEditing = Boolean(editingSpeakerId);

    try {
      const payload = {
        name,
        email,
        institution: institution || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        eventIds: selectedEventIds,
      };

      if (editingSpeakerId) {
        await apiFetch(`/speakers/${editingSpeakerId}`, {
          method: 'PUT',
          json: payload,
        });
      } else {
        await apiFetch('/speakers', {
          method: 'POST',
          json: payload,
        });
      }

      setSuccessMessage(
        isEditing
          ? 'Palestrante atualizado com sucesso.'
          : 'Palestrante criado com sucesso.',
      );
      addToast(
        isEditing
          ? 'Palestrante atualizado com sucesso.'
          : 'Palestrante criado com sucesso.',
        'success',
      );
      resetForm();
      await loadSpeakers();
    } catch (createError) {
      setFormError(
        createError instanceof Error
          ? createError.message
          : 'Erro ao criar palestrante.',
      );
      addToast(
        createError instanceof Error
          ? createError.message
          : 'Erro ao criar palestrante.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSpeaker(speakerId: string) {
    setFormError(null);
    setSuccessMessage(null);

    const speaker = speakers.find((item) => item.id === speakerId);
    if (
      !window.confirm(`Excluir o palestrante ${speaker?.name ?? speakerId}?`)
    ) {
      return;
    }

    try {
      await apiFetch(`/speakers/${speakerId}`, { method: 'DELETE' });
      setSuccessMessage('Palestrante removido com sucesso.');
      addToast('Palestrante removido com sucesso.', 'success');
      await loadSpeakers();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir palestrante.',
      );
      addToast(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir palestrante.',
        'error',
      );
    }
  }

  const speakersWithEvents = useMemo(() => {
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return [...filteredSpeakers]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((speaker) => ({
        speaker,
        events: (speaker.eventIds ?? [])
          .map((eventId) => eventsById.get(eventId))
          .filter((event): event is EventRecord => Boolean(event)),
      }));
  }, [events, filteredSpeakers]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingSpeakerId ? 'Editar palestrante' : 'Cadastrar palestrante'}
          </CardTitle>
          <CardDescription>
            {editingSpeakerId
              ? 'Atualize os dados e os eventos vinculados do palestrante selecionado.'
              : 'Preencha os dados para criar um novo palestrante e vinculá-lo aos eventos.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmitSpeaker}>
            {editingSpeakerId ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-academy-text">
                    Edição em andamento
                  </p>
                  <p className="text-xs text-slate-500">
                    {name || 'Palestrante selecionado'} ·{' '}
                    {email || 'sem e-mail'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                  Cancelar edição
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                E-mail
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Instituição
                <Input
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Telefone
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Bio
                <Input
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </label>
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                Eventos do palestrante
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-3 text-xs text-slate-500">
                    Selecione os eventos em que este palestrante participará.
                  </p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {events.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum evento disponível.
                      </p>
                    ) : (
                      events.map((eventItem) => {
                        const checked = selectedEventIds.includes(eventItem.id);

                        return (
                          <label
                            key={eventItem.id}
                            className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${checked ? 'border-academy-primary bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-academy-primary focus:ring-academy-primary"
                              checked={checked}
                              onChange={() =>
                                toggleEventSelection(eventItem.id)
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">
                                {eventItem.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {eventItem.location} · {eventItem.type}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDateOnlyUTC(eventItem.startDate)} até{' '}
                                {formatDateOnlyUTC(eventItem.endDate)}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Selecionados: {selectedEventIds.length}
                  </p>
                </div>
              </div>

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
                <Button type="submit" disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {saving
                    ? 'Salvando...'
                    : editingSpeakerId
                      ? 'Atualizar palestrante'
                      : 'Criar palestrante'}
                </Button>
                {editingSpeakerId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={resetForm}
                  >
                    Limpar formulário
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de palestrantes</CardTitle>
          <CardDescription>
            Gerencie, atualize e exclua palestrantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Buscar palestrantes
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nome, e-mail, instituição, bio, evento"
              />
            </label>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                type="button"
                variant={viewMode === 'active' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('active')}
              >
                Ativos
              </Button>
              <Button
                type="button"
                variant={viewMode === 'inactive' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('inactive')}
              >
                Inativos
              </Button>
              <Button
                type="button"
                variant={viewMode === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('all')}
              >
                Todos
              </Button>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setViewMode('active');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </div>

          {loading ? <p>Carregando palestrantes...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && filteredSpeakers.length === 0 ? (
            <p>Nenhum palestrante encontrado.</p>
          ) : null}

          {speakersWithEvents.map(({ speaker, events: speakerEvents }) => (
            <div
              key={speaker.id}
              className="rounded-3xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-academy-text">
                    {speaker.name}
                  </p>
                  <p className="text-slate-500">
                    {speaker.institution ?? 'Instituição não informada'} ·{' '}
                    {speaker.email}
                  </p>
                  <p className="mt-2 text-slate-600">
                    {speaker.bio ?? 'Sem bio cadastrada.'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <Badge tone="default">{speakerEvents.length} evento(s)</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => beginEdit(speaker)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => handleDeleteSpeaker(speaker.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {speakerEvents.length === 0 ? (
                  <span className="text-sm text-slate-500">
                    Sem eventos vinculados.
                  </span>
                ) : (
                  speakerEvents.map((event) => (
                    <Badge
                      key={event.id}
                      tone={event.status === 'ATIVA' ? 'success' : 'neutral'}
                    >
                      {event.title}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

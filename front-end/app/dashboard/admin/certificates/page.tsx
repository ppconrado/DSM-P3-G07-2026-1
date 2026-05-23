'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Upload, Trash2 } from 'lucide-react';
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
import { apiFetch, API_BASE_URL, extractErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { fetchSession } from '@/lib/auth';
import type {
  CertificateRecord,
  EventRecord,
  RegistrationRecord,
  UserRecord,
} from '@/lib/domain';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function AdminCertificatesPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [adminUserId, setAdminUserId] = useState('');
  const [registrationId, setRegistrationId] = useState(
    () => searchParams.get('emitRegistrationId') ?? '',
  );
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState(
    () => searchParams.get('regQ') ?? '',
  );
  const [registrationEligibilityFilter, setRegistrationEligibilityFilter] =
    useState<'all' | 'eligible' | 'pending'>(() => {
      const value = searchParams.get('regEligibility');
      if (value === 'eligible' || value === 'pending') {
        return value;
      }

      return 'all';
    });
  const [registrationEventFilter, setRegistrationEventFilter] = useState(
    () => searchParams.get('regEvent') ?? 'all',
  );
  const [certificateSearchTerm, setCertificateSearchTerm] = useState(
    () => searchParams.get('certQ') ?? '',
  );
  const [certificateEventFilter, setCertificateEventFilter] = useState(
    () => searchParams.get('certEvent') ?? 'all',
  );
  const [certificateDateFrom, setCertificateDateFrom] = useState(
    () => searchParams.get('certFrom') ?? '',
  );
  const [certificateDateTo, setCertificateDateTo] = useState(
    () => searchParams.get('certTo') ?? '',
  );
  const [certificateExpiryFilter, setCertificateExpiryFilter] = useState<
    'all' | 'valid' | 'expired' | 'no-expiration'
  >(() => {
    const value = searchParams.get('certExpiry');
    if (value === 'valid' || value === 'expired' || value === 'no-expiration') {
      return value;
    }

    return 'all';
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const [session, certificateList, registrationList, userList, eventList] =
        await Promise.all([
          fetchSession(),
          apiFetch<CertificateRecord[]>('/certificates'),
          apiFetch<RegistrationRecord[]>('/registrations'),
          apiFetch<UserRecord[]>('/users?includeInactive=true'),
          apiFetch<EventRecord[]>('/events'),
        ]);

      setAdminUserId(session.user.id);
      setCertificates(certificateList);
      setRegistrations(registrationList);
      setUsers(userList);
      setEvents(eventList);
    } catch (loadError) {
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
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setRegistrationId('');
    setPdfFile(null);
    setPdfUrl('');
    setIssueDate('');
    setExpiresAt('');
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleUploadPdf() {
    if (!pdfFile) {
      setFormError('Selecione um PDF para upload.');
      return;
    }

    setUploading(true);
    setFormError(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/certificates/upload`;

      const pdfUrlResp: { pdfUrl?: string } = {};

      const promise: Promise<void> = new Promise((resolve, reject) => {
        xhr.open('POST', url);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              pdfUrlResp.pdfUrl = json.pdfUrl ?? json?.data?.pdfUrl ?? '';
              resolve();
            } catch (e) {
              reject(new Error('Resposta inválida do servidor.'));
            }
          } else {
            reject(
              new Error(extractErrorMessage(xhr.responseText, xhr.status)),
            );
          }
        };

        xhr.onerror = () => reject(new Error('Erro na requisição de upload.'));

        xhr.send(formData);
      });

      await promise;

      if (pdfUrlResp.pdfUrl) {
        setPdfUrl(pdfUrlResp.pdfUrl);
      } else {
        throw new Error('URL do PDF não retornada pelo servidor.');
      }
    } catch (uploadError) {
      setFormError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Erro ao enviar o PDF.',
      );
      addToast(
        uploadError instanceof Error
          ? uploadError.message
          : 'Erro ao enviar o PDF.',
        'error',
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleCreateCertificate(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      await apiFetch('/certificates', {
        method: 'POST',
        json: {
          registrationId,
          pdfUrl,
          issueDate: issueDate || undefined,
          expiresAt: expiresAt || undefined,
          issuedByAdminId: adminUserId,
        },
      });

      resetForm();
      setSuccessMessage('Certificado emitido com sucesso.');
      addToast('Certificado emitido com sucesso.', 'success');
      await loadData();
    } catch (createError) {
      setFormError(
        createError instanceof Error
          ? createError.message
          : 'Erro ao emitir certificado.',
      );
      addToast(
        createError instanceof Error
          ? createError.message
          : 'Erro ao emitir certificado.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCertificate(certificateId: string) {
    setFormError(null);
    setSuccessMessage(null);

    const certificate = certificates.find((item) => item.id === certificateId);
    if (
      !window.confirm(
        `Excluir o certificado ${certificate?.verificationCode ?? certificateId}?`,
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/certificates/${certificateId}`, { method: 'DELETE' });
      setSuccessMessage('Certificado excluído com sucesso.');
      addToast('Certificado excluído com sucesso.', 'success');
      await loadData();
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir certificado.',
      );
      addToast(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir certificado.',
        'error',
      );
    }
  }

  const certificatesWithRelations = useMemo(() => {
    const registrationsById = new Map(
      registrations.map((registration) => [registration.id, registration]),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return certificates
      .map((certificate) => {
        const registration = registrationsById.get(certificate.registrationId);
        const user = registration
          ? usersById.get(registration.participantId)
          : undefined;
        const event = registration
          ? eventsById.get(registration.eventId)
          : undefined;

        return { certificate, registration, user, event };
      })
      .sort(
        (left, right) =>
          new Date(right.certificate.issueDate).getTime() -
          new Date(left.certificate.issueDate).getTime(),
      );
  }, [certificates, events, registrations, users]);

  const availableEvents = useMemo(
    () =>
      [...events].sort((left, right) => left.title.localeCompare(right.title)),
    [events],
  );

  const certificatesByRegistrationId = useMemo(
    () =>
      new Set(certificates.map((certificate) => certificate.registrationId)),
    [certificates],
  );

  const registrationCandidates = useMemo(() => {
    const usersById = new Map(users.map((user) => [user.id, user]));
    const eventsById = new Map(events.map((event) => [event.id, event]));

    return registrations
      .map((registration) => {
        const user = usersById.get(registration.participantId);
        const event = eventsById.get(registration.eventId);

        return {
          registration,
          user,
          event,
          hasCertificate: certificatesByRegistrationId.has(registration.id),
        };
      })
      .sort((left, right) => {
        const leftRecommended =
          left.registration.approvedForCertificate && !left.hasCertificate;
        const rightRecommended =
          right.registration.approvedForCertificate && !right.hasCertificate;

        if (leftRecommended !== rightRecommended) {
          return rightRecommended ? 1 : -1;
        }

        const eventCompare = (left.event?.title ?? '').localeCompare(
          right.event?.title ?? '',
        );

        if (eventCompare !== 0) {
          return eventCompare;
        }

        return (left.user?.name ?? '').localeCompare(right.user?.name ?? '');
      });
  }, [certificatesByRegistrationId, events, registrations, users]);

  const filteredRegistrationCandidates = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(
      registrationSearchTerm.trim(),
    );

    return registrationCandidates.filter(({ registration, user, event }) => {
      if (
        registrationEligibilityFilter === 'eligible' &&
        !registration.approvedForCertificate
      ) {
        return false;
      }

      if (
        registrationEligibilityFilter === 'pending' &&
        registration.approvedForCertificate
      ) {
        return false;
      }

      if (
        registrationEventFilter !== 'all' &&
        registration.eventId !== registrationEventFilter
      ) {
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
          registration.attendancePercent.toFixed(0),
          registration.approvedForCertificate ? 'apto' : 'pendente',
        ].join(' '),
      );

      return searchableText.includes(normalizedSearchTerm);
    });
  }, [
    registrationCandidates,
    registrationEligibilityFilter,
    registrationEventFilter,
    registrationSearchTerm,
  ]);

  const selectedRegistrationContext = useMemo(
    () =>
      registrationCandidates.find(
        ({ registration }) => registration.id === registrationId,
      ) ?? null,
    [registrationCandidates, registrationId],
  );

  const selectableRegistrationCandidates = useMemo(() => {
    if (
      !selectedRegistrationContext ||
      filteredRegistrationCandidates.some(
        ({ registration }) =>
          registration.id === selectedRegistrationContext.registration.id,
      )
    ) {
      return filteredRegistrationCandidates;
    }

    return [selectedRegistrationContext, ...filteredRegistrationCandidates];
  }, [filteredRegistrationCandidates, selectedRegistrationContext]);

  const recommendedRegistrationCount = useMemo(
    () =>
      filteredRegistrationCandidates.filter(
        ({ registration, hasCertificate }) =>
          registration.approvedForCertificate && !hasCertificate,
      ).length,
    [filteredRegistrationCandidates],
  );

  const filteredCertificatesWithRelations = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(
      certificateSearchTerm.trim(),
    );
    const today = new Date().toISOString().slice(0, 10);

    return certificatesWithRelations.filter(
      ({ certificate, registration, user, event }) => {
        if (
          certificateEventFilter !== 'all' &&
          registration?.eventId !== certificateEventFilter
        ) {
          return false;
        }

        const issueDateOnly = certificate.issueDate.slice(0, 10);

        if (certificateDateFrom && issueDateOnly < certificateDateFrom) {
          return false;
        }

        if (certificateDateTo && issueDateOnly > certificateDateTo) {
          return false;
        }

        if (
          certificateExpiryFilter === 'no-expiration' &&
          certificate.expiresAt
        ) {
          return false;
        }

        if (certificateExpiryFilter === 'expired') {
          if (
            !certificate.expiresAt ||
            certificate.expiresAt.slice(0, 10) >= today
          ) {
            return false;
          }
        }

        if (certificateExpiryFilter === 'valid') {
          if (
            !certificate.expiresAt ||
            certificate.expiresAt.slice(0, 10) < today
          ) {
            return false;
          }
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableText = normalizeSearchText(
          [
            certificate.verificationCode,
            user?.name ?? '',
            user?.email ?? '',
            event?.title ?? '',
            event?.location ?? '',
            registration?.status ?? '',
            formatDateOnlyUTC(certificate.issueDate),
            certificate.attendancePercentAtIssue.toFixed(0),
          ].join(' '),
        );

        return searchableText.includes(normalizedSearchTerm);
      },
    );
  }, [
    certificateDateFrom,
    certificateDateTo,
    certificateEventFilter,
    certificateExpiryFilter,
    certificateSearchTerm,
    certificatesWithRelations,
  ]);

  const hasActiveRegistrationFilters =
    registrationSearchTerm.trim() !== '' ||
    registrationEligibilityFilter !== 'all' ||
    registrationEventFilter !== 'all';

  const hasActiveCertificateFilters =
    certificateSearchTerm.trim() !== '' ||
    certificateEventFilter !== 'all' ||
    certificateDateFrom !== '' ||
    certificateDateTo !== '' ||
    certificateExpiryFilter !== 'all';

  const certificatePageFilterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (registrationId) {
      params.set('emitRegistrationId', registrationId);
    }

    if (registrationSearchTerm.trim()) {
      params.set('regQ', registrationSearchTerm.trim());
    }

    if (registrationEligibilityFilter !== 'all') {
      params.set('regEligibility', registrationEligibilityFilter);
    }

    if (registrationEventFilter !== 'all') {
      params.set('regEvent', registrationEventFilter);
    }

    if (certificateSearchTerm.trim()) {
      params.set('certQ', certificateSearchTerm.trim());
    }

    if (certificateEventFilter !== 'all') {
      params.set('certEvent', certificateEventFilter);
    }

    if (certificateDateFrom) {
      params.set('certFrom', certificateDateFrom);
    }

    if (certificateDateTo) {
      params.set('certTo', certificateDateTo);
    }

    if (certificateExpiryFilter !== 'all') {
      params.set('certExpiry', certificateExpiryFilter);
    }

    return params;
  }, [
    certificateDateFrom,
    certificateDateTo,
    certificateEventFilter,
    certificateExpiryFilter,
    certificateSearchTerm,
    registrationEligibilityFilter,
    registrationEventFilter,
    registrationId,
    registrationSearchTerm,
  ]);

  useEffect(() => {
    const nextQueryString = certificatePageFilterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [certificatePageFilterParams, pathname, router, searchParams]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[var(--admin-left-width)_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Emitir certificado</CardTitle>
            <CardDescription>
              Criação direta com vínculo ao ADMIN autenticado.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading ? (
              <div className="space-y-3">
                <div className="h-6 w-3/4 rounded bg-slate-200/60 animate-pulse" />
                <div className="h-6 w-full rounded bg-slate-200/60 animate-pulse" />
                <div className="h-6 w-1/2 rounded bg-slate-200/60 animate-pulse" />
              </div>
            ) : (
              <form
                className="grid min-w-0 gap-4"
                onSubmit={handleCreateCertificate}
              >
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Buscar inscrição para emissão
                  <Input
                    value={registrationSearchTerm}
                    onChange={(event) =>
                      setRegistrationSearchTerm(event.target.value)
                    }
                    placeholder="Participante, e-mail, evento, local ou status"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Evento da inscrição
                  <select
                    className="h-11 w-full max-w-full truncate rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                    value={registrationEventFilter}
                    onChange={(event) =>
                      setRegistrationEventFilter(event.target.value)
                    }
                  >
                    <option value="all">Todos os eventos</option>
                    {availableEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={
                      registrationEligibilityFilter === 'all'
                        ? 'default'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => setRegistrationEligibilityFilter('all')}
                  >
                    Todas inscrições
                  </Button>
                  <Button
                    type="button"
                    variant={
                      registrationEligibilityFilter === 'eligible'
                        ? 'default'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => setRegistrationEligibilityFilter('eligible')}
                  >
                    Aptas para certificado
                  </Button>
                  <Button
                    type="button"
                    variant={
                      registrationEligibilityFilter === 'pending'
                        ? 'default'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => setRegistrationEligibilityFilter('pending')}
                  >
                    Não aptas
                  </Button>

                  {hasActiveRegistrationFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRegistrationSearchTerm('');
                        setRegistrationEligibilityFilter('all');
                        setRegistrationEventFilter('all');
                      }}
                    >
                      Limpar filtros
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500">
                  Recomendações prontas para emitir:{' '}
                  {recommendedRegistrationCount}
                </p>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Inscrição
                  <select
                    className="h-11 w-full max-w-full truncate rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                    value={registrationId}
                    onChange={(event) => setRegistrationId(event.target.value)}
                    required
                  >
                    <option value="">Selecione a inscrição</option>
                    {selectableRegistrationCandidates.map(
                      ({ registration, user, event, hasCertificate }) => (
                        <option
                          key={registration.id}
                          value={registration.id}
                          disabled={hasCertificate}
                        >
                          {(registration.approvedForCertificate &&
                          !hasCertificate
                            ? '★ '
                            : '') +
                            (user?.name ?? 'Participante sem nome') +
                            ' · ' +
                            (event?.title ?? 'Evento') +
                            ' · ' +
                            registration.attendancePercent.toFixed(0) +
                            '%' +
                            (hasCertificate ? ' · Já emitido' : '')}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {selectedRegistrationContext ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">
                      Resumo da inscrição selecionada
                    </p>
                    <p className="mt-1">
                      Participante:{' '}
                      {selectedRegistrationContext.user?.name ??
                        selectedRegistrationContext.registration.participantId}
                    </p>
                    <p>
                      Evento:{' '}
                      {selectedRegistrationContext.event?.title ??
                        selectedRegistrationContext.registration.eventId}
                    </p>
                    <p>
                      Presença:{' '}
                      {selectedRegistrationContext.registration.attendancePercent.toFixed(
                        0,
                      )}
                      % ·{' '}
                      {selectedRegistrationContext.registration
                        .approvedForCertificate
                        ? 'Apto para certificado'
                        : 'Não apto'}
                    </p>
                    <p>
                      Status da inscrição:{' '}
                      {selectedRegistrationContext.registration.status}
                    </p>
                  </div>
                ) : null}

                {filteredRegistrationCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhuma inscrição corresponde aos filtros atuais.
                  </p>
                ) : null}

                {selectableRegistrationCandidates.length > 0 &&
                selectableRegistrationCandidates.every(
                  ({ hasCertificate }) => hasCertificate,
                ) ? (
                  <p className="text-xs text-slate-500">
                    As inscrições listadas já possuem certificado emitido.
                  </p>
                ) : null}

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  PDF local
                  <Input
                    id="certificate-pdf-upload"
                    type="file"
                    accept="application/pdf"
                    aria-describedby="certificate-pdf-help certificate-pdf-status"
                    onChange={(event) => {
                      setPdfFile(event.target.files?.[0] ?? null);
                      setPdfUrl('');
                      setFormError(null);
                      setSuccessMessage(null);
                    }}
                  />
                </label>

                <p id="certificate-pdf-help" className="text-xs text-slate-500">
                  Selecione um arquivo PDF antes de enviar para emissão.
                </p>

                {pdfFile ? (
                  <p className="text-xs text-slate-500">
                    Arquivo selecionado:{' '}
                    <span className="font-medium text-slate-700">
                      {pdfFile.name}
                    </span>
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUploadPdf}
                  disabled={uploading || !pdfFile || Boolean(pdfUrl)}
                >
                  <Upload className="h-4 w-4" />
                  {uploading
                    ? 'Enviando PDF...'
                    : pdfUrl
                      ? 'PDF enviado'
                      : 'Enviar PDF'}
                </Button>

                {uploading ? (
                  <div className="mt-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-academy-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Progresso: {uploadProgress}%
                    </p>
                  </div>
                ) : null}

                {pdfUrl ? (
                  <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p className="font-medium">PDF pronto para emissão.</p>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block font-semibold underline underline-offset-2"
                    >
                      Abrir arquivo enviado
                    </a>
                  </div>
                ) : null}

                <div
                  id="certificate-pdf-status"
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"
                  aria-live="polite"
                >
                  <p className="font-medium text-slate-700">URL do PDF</p>
                  <p className="mt-1 break-all">
                    {pdfUrl || 'Será preenchida automaticamente após o upload.'}
                  </p>
                </div>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Data de emissão
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Validade até
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
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

                <Button
                  type="submit"
                  disabled={saving || !adminUserId || !pdfUrl}
                  aria-describedby="certificate-pdf-help"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? 'Emitindo...' : 'Emitir certificado'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Certificados emitidos</CardTitle>
            <CardDescription>
              Base para emissão automática e consulta por código.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3 text-sm text-slate-600">
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Buscar certificado
                <Input
                  value={certificateSearchTerm}
                  onChange={(event) =>
                    setCertificateSearchTerm(event.target.value)
                  }
                  placeholder="Código, participante, e-mail ou evento"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Emissão a partir de
                  <Input
                    type="date"
                    value={certificateDateFrom}
                    onChange={(event) =>
                      setCertificateDateFrom(event.target.value)
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Emissão até
                  <Input
                    type="date"
                    value={certificateDateTo}
                    onChange={(event) =>
                      setCertificateDateTo(event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Evento
                <select
                  className="h-11 w-full max-w-full truncate rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                  value={certificateEventFilter}
                  onChange={(event) =>
                    setCertificateEventFilter(event.target.value)
                  }
                >
                  <option value="all">Todos os eventos</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    certificateExpiryFilter === 'all' ? 'default' : 'secondary'
                  }
                  size="sm"
                  onClick={() => setCertificateExpiryFilter('all')}
                >
                  Validade: todos
                </Button>
                <Button
                  type="button"
                  variant={
                    certificateExpiryFilter === 'valid'
                      ? 'default'
                      : 'secondary'
                  }
                  size="sm"
                  onClick={() => setCertificateExpiryFilter('valid')}
                >
                  Com validade ativa
                </Button>
                <Button
                  type="button"
                  variant={
                    certificateExpiryFilter === 'expired'
                      ? 'default'
                      : 'secondary'
                  }
                  size="sm"
                  onClick={() => setCertificateExpiryFilter('expired')}
                >
                  Vencidos
                </Button>
                <Button
                  type="button"
                  variant={
                    certificateExpiryFilter === 'no-expiration'
                      ? 'default'
                      : 'secondary'
                  }
                  size="sm"
                  onClick={() => setCertificateExpiryFilter('no-expiration')}
                >
                  Sem validade
                </Button>

                {hasActiveCertificateFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCertificateSearchTerm('');
                      setCertificateEventFilter('all');
                      setCertificateDateFrom('');
                      setCertificateDateTo('');
                      setCertificateExpiryFilter('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </div>
            </div>

            {loading ? <p>Carregando certificados...</p> : null}
            {error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
                {error}
              </p>
            ) : null}

            {!loading &&
            !error &&
            filteredCertificatesWithRelations.length === 0 ? (
              <p>Nenhum certificado encontrado.</p>
            ) : null}

            {filteredCertificatesWithRelations.map(
              ({ certificate, registration, user, event }) => (
                <div
                  key={certificate.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-academy-text">
                      {user?.name ??
                        registration?.participantId ??
                        certificate.registrationId}{' '}
                      · {event?.title ?? registration?.eventId ?? 'Evento'}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Emitido em {formatDateOnlyUTC(certificate.issueDate)} ·
                      Código {certificate.verificationCode} ·{' '}
                      {certificate.attendancePercentAtIssue.toFixed(0)}%
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {registration ? (
                        <Badge
                          tone={
                            registration.status === 'ATIVO'
                              ? 'success'
                              : registration.status === 'CONCLUIDO'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {registration.status}
                        </Badge>
                      ) : null}
                      <Badge
                        tone={certificate.expiresAt ? 'warning' : 'neutral'}
                      >
                        {certificate.expiresAt
                          ? `Validade ${formatDateOnlyUTC(certificate.expiresAt)}`
                          : 'Sem validade'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={certificate.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20"
                    >
                      Download PDF
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCertificate(certificate.id)}
                      aria-label={`Excluir certificado ${certificate.verificationCode}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AdminCertificatesPage() {
  return (
    <Suspense fallback={null}>
      <AdminCertificatesPageContent />
    </Suspense>
  );
}

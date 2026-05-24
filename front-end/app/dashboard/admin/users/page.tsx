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
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useAutoHideMessage } from '@/lib/useAutoHideMessage';
import type { UserRecord } from '@/lib/domain';

function roleTone(role: UserRecord['role']) {
  return role === 'ADMIN' ? 'warning' : 'default';
}

function AdminUsersPageContent() {
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'inactive' | 'all'>(
    () => {
      const value = searchParams.get('view');
      if (value === 'inactive' || value === 'all') {
        return value;
      }

      return 'active';
    },
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRecord['role']>('PARTICIPANTE');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useAutoHideMessage(successMessage, () => setSuccessMessage(null));

  function resetForm() {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('PARTICIPANTE');
    setPassword('');
    setFormError(null);
    setSuccessMessage(null);
  }

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<UserRecord[]>('/users?includeInactive=true');
      setUsers(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar usuários.',
      );
      addToast(
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar usuários.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function beginEdit(user: UserRecord) {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setRole(user.role);
    setPassword('');
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        phone: phone || undefined,
        role,
      };

      if (editingUserId) {
        if (password) {
          payload.password = password;
        }

        await apiFetch(`/users/${editingUserId}`, {
          method: 'PUT',
          json: payload,
        });
      } else {
        await apiFetch('/users', {
          method: 'POST',
          json: {
            ...payload,
            password,
          },
        });
      }

      resetForm();
      setSuccessMessage(
        editingUserId
          ? 'Usuário atualizado com sucesso.'
          : 'Usuário criado com sucesso.',
      );
      addToast(
        editingUserId
          ? 'Usuário atualizado com sucesso.'
          : 'Usuário criado com sucesso.',
        'success',
      );
      await loadUsers();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar usuário.',
      );
      addToast(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar usuário.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: UserRecord) {
    setFormError(null);
    setSuccessMessage(null);

    const confirmMessage =
      user.isActive === false
        ? `Reativar o usuário ${user.name}?`
        : `Desativar o usuário ${user.name}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (user.isActive === false) {
        await apiFetch(`/users/${user.id}`, {
          method: 'PUT',
          json: { isActive: true },
        });
        setSuccessMessage('Usuário reativado com sucesso.');
        addToast('Usuário reativado com sucesso.', 'success');
      } else {
        await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
        setSuccessMessage('Usuário inativado com sucesso.');
        addToast('Usuário inativado com sucesso.', 'success');
      }

      await loadUsers();
    } catch (toggleError) {
      setFormError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Erro ao atualizar usuário.',
      );
      addToast(
        toggleError instanceof Error
          ? toggleError.message
          : 'Erro ao atualizar usuário.',
        'error',
      );
    }
  }

  const orderedUsers = useMemo(
    () => [...users].sort((left, right) => left.name.localeCompare(right.name)),
    [users],
  );

  const activeUsers = useMemo(
    () => orderedUsers.filter((user) => user.isActive !== false),
    [orderedUsers],
  );

  const inactiveUsers = useMemo(
    () => orderedUsers.filter((user) => user.isActive === false),
    [orderedUsers],
  );

  const visibleUsers =
    viewMode === 'active'
      ? activeUsers
      : viewMode === 'inactive'
        ? inactiveUsers
        : orderedUsers;

  const filteredUsers = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return visibleUsers;
    }

    return visibleUsers.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedSearchTerm) ||
        user.email.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [searchTerm, visibleUsers]);

  const viewLabel =
    viewMode === 'active'
      ? 'ativos'
      : viewMode === 'inactive'
        ? 'inativos'
        : 'todos';

  const hasActiveFilters = searchTerm.trim() !== '' || viewMode !== 'active';

  const usersFilterParams = useMemo(() => {
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
    const nextQueryString = usersFilterParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString !== currentQueryString) {
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false },
      );
    }
  }, [pathname, router, searchParams, usersFilterParams]);

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lista de usuários</CardTitle>
            <CardDescription>
              Separei os usuários por status para facilitar a gestão e a
              reativação.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Buscar usuário
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome ou e-mail"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={viewMode === 'active' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('active')}
            >
              Ativos ({activeUsers.length})
            </Button>
            <Button
              type="button"
              variant={viewMode === 'inactive' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('inactive')}
            >
              Inativos ({inactiveUsers.length})
            </Button>
            <Button
              type="button"
              variant={viewMode === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              Todos ({orderedUsers.length})
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

          {loading ? <p>Carregando usuários...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && filteredUsers.length === 0 ? (
            <p>Nenhum usuário {viewLabel} encontrado.</p>
          ) : null}

          {filteredUsers.map((user) => (
            <div key={user.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-academy-text">{user.name}</p>
                  <p className="mt-1 text-slate-500">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                  <Badge tone={user.isActive === false ? 'neutral' : 'success'}>
                    {user.isActive === false ? 'inativo' : 'ativo'}
                  </Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => beginEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {user.isActive === false ? 'Reativar' : 'Desativar'}
                  </Button>
                </div>
              </div>

              {editingUserId === user.id ? (
                <form
                  className="mt-4 rounded-3xl border border-slate-200 bg-white p-4"
                  onSubmit={handleSubmit}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-sm">Editar usuário</CardTitle>
                      <p className="text-xs text-slate-500">
                        {user.name} · {user.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={resetForm}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4">
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
                      Telefone
                      <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Papel
                      <select
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-academy-text shadow-sm"
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as UserRecord['role'])
                        }
                      >
                        <option value="PARTICIPANTE">PARTICIPANTE</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Nova senha (opcional)
                      <Input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
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

                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" disabled={saving}>
                        <Plus className="h-4 w-4" />
                        {saving ? 'Salvando...' : 'Atualizar usuário'}
                      </Button>
                    </div>
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPageContent />
    </Suspense>
  );
}

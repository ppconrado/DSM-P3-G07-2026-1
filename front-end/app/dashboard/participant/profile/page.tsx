'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { fetchSession, type AuthUser } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

export default function ParticipantProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const session = await fetchSession();

        if (!active) return;

        setUser(session.user);
        setName(session.user.name);
        setEmail(session.user.email);
        setPhone(session.user.phone ?? '');
      } catch (loadError) {
        if (!active) return;

        const msg =
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar perfil.';
        setError(msg);
        addToast(msg, 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        json: {
          name,
          email,
          phone: phone || undefined,
          password: password || undefined,
        },
      });

      const session = await fetchSession();
      setUser(session.user);
      setName(session.user.name);
      setEmail(session.user.email);
      setPhone(session.user.phone ?? '');
      setPassword('');
      addToast('Perfil atualizado com sucesso.', 'success');
    } catch (submitError) {
      setSaveError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao atualizar perfil.',
      );
      addToast(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao atualizar perfil.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dados do perfil</CardTitle>
          <CardDescription>
            Campos principais do usuário autenticado pela sessão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {loading ? <p>Carregando perfil...</p> : null}
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {user ? (
            <form
              className="rounded-3xl border border-slate-200 bg-white p-4"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-academy-text">{user.name}</p>
                  <p className="text-slate-600">{user.email}</p>
                </div>
                <Badge tone="default">{user.role}</Badge>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Nome
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  E-mail
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                  Nova senha
                  <Input
                    type="password"
                    placeholder="Deixe em branco para manter a atual"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                <div className="space-y-2 text-slate-600">
                  <p>Status: {user.isActive ? 'ativo' : 'inativo'}</p>
                  <p>Curso vinculado: conforme cadastro institucional</p>
                  <p>Senha: alteração protegida pelo back-end</p>
                </div>

                {saveError ? (
                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                  </p>
                ) : null}

                <Button type="submit" disabled={saving} className="w-fit">
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

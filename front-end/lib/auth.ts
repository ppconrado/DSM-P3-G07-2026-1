import { apiFetch } from '@/lib/api';

export type UserRole = 'ADMIN' | 'PARTICIPANTE';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive?: boolean;
};

export type LoginResponse = {
  user: AuthUser;
  message: string;
};

export type MeResponse = {
  user: AuthUser;
};

export async function loginWithEmailAndPassword(
  email: string,
  password: string,
) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { email, password },
  });
}

export async function fetchSession() {
  return apiFetch<MeResponse>('/auth/me');
}

export async function logout() {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export const site = {
  name: 'AcademyFlow',
  slogan: 'Conectando conhecimento e experiências',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8888',
};

export const adminNavItems = [
  { href: '/dashboard/admin', label: 'Resumo' },
  { href: '/dashboard/admin/users', label: 'Usuários' },
  { href: '/dashboard/admin/events', label: 'Eventos' },
  { href: '/dashboard/admin/speakers', label: 'Palestrantes' },
  { href: '/dashboard/admin/sessions', label: 'Sessões' },
  { href: '/dashboard/admin/attendance', label: 'Presenças' },
  { href: '/dashboard/admin/registrations', label: 'Inscrições' },
  { href: '/dashboard/admin/certificates', label: 'Certificados' },
];

export const participantNavItems = [
  { href: '/dashboard/participant', label: 'Resumo' },
  { href: '/dashboard/participant/events', label: 'Eventos' },
  { href: '/dashboard/participant/registrations', label: 'Minhas inscrições' },
  { href: '/dashboard/participant/certificates', label: 'Certificados' },
  { href: '/dashboard/participant/profile', label: 'Perfil' },
];

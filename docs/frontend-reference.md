# AcademyFlow Front-End Reference

Documento de apoio para a implementação do front-end em Next.js.

## Fonte de verdade

Quando houver divergência, prevalecem os documentos fundamentais do projeto:

- `docs/funcionamento_sistema.md`
- `docs/postman_collection.json`
- `docs/UML-Gerenciamento-Palestras-Estrito.drawio`
- `docs/memorial_descritivo_noam_abnt.md`
- `docs/rotas-controllers-mapeamento.md`
- `docs/error-messages.md`

## Decisões do front-end

- Framework: Next.js com App Router e TypeScript
- Estilo: Tailwind CSS + Radix UI
- Auth: JWT com cookies `HttpOnly`, `credentials: 'include'` no cliente
- Auth endpoints: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- Público: landing page institucional, login e recuperação de senha
- Painéis: ADMIN e PARTICIPANTE separados por rota
- Deploy: Vercel para o front-end
- API local: `http://localhost:8888`

## Decisão de sessão

- O back-end guarda o hash da senha em MongoDB via Prisma, como já existia no projeto.
- O refresh token é persistido no usuário como hash para permitir logout invalidável no servidor.
- O front-end protege rotas de dashboard validando a sessão em `/auth/me` e redirecionando por role.

## Rotas planejadas

### Públicas

- `/` landing page
- `/login`
- `/forgot-password`

### PARTICIPANTE

- `/dashboard/participant`
- `/dashboard/participant/events`
- `/dashboard/participant/registrations`
- `/dashboard/participant/certificates`
- `/dashboard/participant/profile`

### ADMIN

- `/dashboard/admin`
- `/dashboard/admin/users`
- `/dashboard/admin/events`
- `/dashboard/admin/speakers`
- `/dashboard/admin/sessions`
- `/dashboard/admin/attendance`
- `/dashboard/admin/registrations`
- `/dashboard/admin/certificates`

## Integração com o back-end

O front-end foi preparado para consumir a API já existente em Express, sem alterar as rotas atuais.

Rotas de base mapeadas no back-end:

- `/users`
- `/events`
- `/events/:eventId/sessions`
- `/speakers`
- `/registrations`
- `/registrations/:registrationId/attendance`
- `/certificates`

## Layout e UX

- Landing page com hero, CTA e cards de valor
- Dashboard com sidebar fixa e cards de resumo
- Paleta: azul, verde, laranja, fundo claro e texto escuro
- Tipografia: Montserrat, Lato, Open Sans e Roboto Mono
- Mobile-first com adaptação para desktop administrativo

## Próximos passos naturais

- Conectar login e logout ao back-end
- Substituir dados mockados por chamadas reais à API
- Criar formulários de CRUD para eventos, palestrantes, sessões e usuários
- Implementar proteção de rota por role

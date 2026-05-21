# Mapeamento de Rotas e Controllers - Backend

Documento atualizado para o backend atual em `back-end/src/routes` e `back-end/src/controllers`.

## Rotas ativas

### 1. `index.js`

**Controller/Router**: `index.js`

| Método | Rota | Responsabilidade             |
| ------ | ---- | ---------------------------- |
| GET    | `/`  | Resposta base `Hello World!` |

### 2. `users.js`

**Controller/Router**: `users.js`

| Método | Rota         | Responsabilidade                               |
| ------ | ------------ | ---------------------------------------------- |
| GET    | `/users`     | Listar usuários ativos/inativos                |
| POST   | `/users`     | Criar usuário com `role` ADMIN ou PARTICIPANTE |
| GET    | `/users/:id` | Obter usuário                                  |
| PUT    | `/users/:id` | Atualizar usuário                              |
| DELETE | `/users/:id` | Desativar usuário                              |

### 3. `events.js`

**Controller**: `eventsController.js`

| Método | Rota          | Responsabilidade                            |
| ------ | ------------- | ------------------------------------------- |
| GET    | `/events`     | Listar eventos                              |
| POST   | `/events`     | Criar evento                                |
| GET    | `/events/:id` | Obter evento                                |
| PUT    | `/events/:id` | Atualizar evento e sincronizar `speakerIds` |
| DELETE | `/events/:id` | Remover evento                              |

### 4. `speakers.js`

**Controller**: `speakersController.js`

| Método | Rota            | Responsabilidade                               |
| ------ | --------------- | ---------------------------------------------- |
| GET    | `/speakers`     | Listar palestrantes                            |
| POST   | `/speakers`     | Criar palestrante                              |
| GET    | `/speakers/:id` | Obter palestrante                              |
| PUT    | `/speakers/:id` | Atualizar palestrante e sincronizar `eventIds` |
| DELETE | `/speakers/:id` | Remover palestrante                            |

### 5. `registrations.js`

**Controller**: `registrationsController.js`

| Método | Rota                 | Responsabilidade    |
| ------ | -------------------- | ------------------- |
| GET    | `/registrations`     | Listar inscrições   |
| POST   | `/registrations`     | Criar inscrição     |
| GET    | `/registrations/:id` | Obter inscrição     |
| PUT    | `/registrations/:id` | Atualizar inscrição |
| DELETE | `/registrations/:id` | Remover inscrição   |

### 6. `eventSessions.js`

**Controller**: `eventSessionsController.js`

| Método | Rota                                              | Responsabilidade           |
| ------ | ------------------------------------------------- | -------------------------- |
| GET    | `/events/:eventId/sessions`                       | Listar sessões do evento   |
| POST   | `/events/:eventId/sessions`                       | Criar sessão               |
| GET    | `/events/:eventId/sessions/:id`                   | Obter sessão               |
| PUT    | `/events/:eventId/sessions/:id`                   | Atualizar sessão           |
| DELETE | `/events/:eventId/sessions/:id`                   | Remover sessão             |
| GET    | `/events/:eventId/sessions/:sessionId/attendance` | Listar presenças da sessão |

### 7. `attendance.js`

**Controller**: `attendanceController.js`

| Método | Rota                                                      | Responsabilidade              |
| ------ | --------------------------------------------------------- | ----------------------------- |
| GET    | `/registrations/:registrationId/attendance`               | Listar presenças da inscrição |
| POST   | `/registrations/:registrationId/attendance`               | Criar presença                |
| GET    | `/registrations/:registrationId/attendance/:attendanceId` | Obter presença                |
| PUT    | `/registrations/:registrationId/attendance/:attendanceId` | Atualizar presença            |
| DELETE | `/registrations/:registrationId/attendance/:attendanceId` | Remover presença              |

### 8. `certificates.js`

**Controller**: `certificatesController.js`

| Método | Rota                   | Responsabilidade             |
| ------ | ---------------------- | ---------------------------- |
| GET    | `/certificates`        | Listar certificados          |
| POST   | `/certificates`        | Criar certificado            |
| GET    | `/certificates/:id`    | Obter certificado            |
| PUT    | `/certificates/:id`    | Atualizar certificado        |
| DELETE | `/certificates/:id`    | Remover certificado          |
| POST   | `/certificates/upload` | Upload do PDF do certificado |

## Relação evento-palestrante

**Implementação**: `eventsController.js` e `speakersController.js`

| Método | Rota            | Responsabilidade                    |
| ------ | --------------- | ----------------------------------- |
| PUT    | `/events/:id`   | Atualizar `speakerIds` do evento    |
| PUT    | `/speakers/:id` | Atualizar `eventIds` do palestrante |

**Observação**: a associação é mantida por arrays nos documentos MongoDB.

## Itens que não existem mais neste backend

- As rotas atuais não usam prefixo fixo
- Não existe fluxo público de verificação de certificado
- Não há endpoints de autenticação ou aprovação automática de certificado

## Resumo rápido

- Rotas reais hoje: `/`, `/users`, `/events`, `/events/:eventId/sessions`, `/speakers`, `/registrations`, `/registrations/:registrationId/attendance`, `/certificates`
- Relação `Event` ⇄ `Speaker`: arrays `speakerIds` e `eventIds`
- Testes de fumaça e integração cobrem o fluxo atual do backend

## Fluxo atual resumido

1. Criar/editar `Event`.
2. Criar/editar `Speaker`.
3. Sincronizar associação via `PUT /events/:id` ou `PUT /speakers/:id`.
4. Criar `User` com `role = PARTICIPANTE`, `Registration`, `EventSession` e `Attendance` quando necessário.
5. Criar `Certificate` quando a inscrição estiver apta.
6. Fazer upload do PDF em `POST /certificates/upload`.

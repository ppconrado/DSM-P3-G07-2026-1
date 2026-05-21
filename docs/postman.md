# Guia de Testes de Rotas no Postman

Este documento lista as principais rotas e exemplos de requisições para testar o back-end do sistema de eventos acadêmicos no Postman.

## Usuários

### Criar usuário com role PARTICIPANTE

- **POST** `/users`
- **Body (JSON):**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "phone": "11999999999",
  "role": "PARTICIPANTE"
}
```

**Resposta (201):**

```json
{
  "id": "<id do usuário>",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "role": "PARTICIPANTE"
}
```

Se o e-mail já existir, a API retorna:

```json
{
  "error": "E-mail já cadastrado."
}
```

Outros erros comuns:

```json
{
  "error": "Senha inválida."
}
```

```json
{
  "error": "Função de usuário inválida."
}
```

### Listar usuários

- **GET** `/users`

### Buscar usuário por ID

- **GET** `/users/:id`

### Atualizar usuário

- **PUT** `/users/:id`
- **Body (JSON):** (campos a atualizar; se quiser trocar a senha, envie `password`)

Se a alteração tentar usar um e-mail já cadastrado, a API retorna:

```json
{
  "error": "E-mail já cadastrado."
}
```

Se a alteração enviar senha vazia ou uma função inválida, a API retorna, respectivamente:

```json
{
  "error": "Senha inválida."
}
```

```json
{
  "error": "Função de usuário inválida."
}
```

### Remover usuário

- **DELETE** `/users/:id`

---

## Eventos

### Criar evento

- **POST** `/events`
- **Body (JSON):**

```json
{
  "title": "Semana Acadêmica",
  "description": "Evento anual...",
  "startDate": "2026-05-01",
  "endDate": "2026-05-05",
  "location": "Auditório Central",
  "type": "Palestra",
  "capacity": 100,
  "certificateRequiredPercent": 75,
  "createdByAdminId": "<admin_id>",
  "status": "CRIANDO"
}
```

**Resposta (201):**

```json
{
  "id": "<id do evento>",
  "title": "Semana Acadêmica",
  "status": "CRIANDO",
  "speakerIds": []
}
```

### Listar eventos

- **GET** `/events`

### Buscar evento por ID

- **GET** `/events/:id`

### Atualizar evento

- **PUT** `/events/:id`
- **Body (JSON):** (campos a atualizar)

Se tentar publicar um evento (`status: ATIVA`) sem ao menos uma sessão, a API retorna:

```json
{
  "error": "Não é possível publicar evento sem ao menos uma sessão."
}
```

Se tentar publicar um evento sem ao menos um palestrante, a API retorna:

```json
{
  "error": "Não é possível publicar evento sem ao menos um palestrante."
}
```

### Remover evento

- **DELETE** `/events/:id`

> **Regra de data:** `startDate` e `endDate` aceitam formato `YYYY-MM-DD`. A `sessionDate` de uma sessão deve ficar dentro desse intervalo, inclusive.
> **Regra de admin:** Apenas usuários com `role: ADMIN` podem criar ou atualizar eventos. Se um não-admin tentar criar, a API retorna `403 Apenas ADMIN pode criar eventos.`

---

## Sessões e presença

### Criar sessão

- **POST** `/events/:eventId/sessions`
- **Body (JSON):**

```json
{
  "sessionDate": "2026-05-19",
  "startTime": "09:00",
  "endTime": "11:00",
  "room": "Sala 10"
}
```

### Listar sessões do evento

- **GET** `/events/:eventId/sessions`

### Buscar sessão por ID

- **GET** `/events/:eventId/sessions/:id`

### Atualizar sessão

- **PUT** `/events/:eventId/sessions/:id`

```json
{
  "sessionDate": "2026-05-20",
  "startTime": "10:00",
  "endTime": "12:00",
  "room": "Sala 11"
}
```

### Remover sessão

- **DELETE** `/events/:eventId/sessions/:id`

### Listar presenças da sessão

- **GET** `/events/:eventId/sessions/:sessionId/attendance`

### Listar presenças de uma inscrição

- **GET** `/registrations/:registrationId/attendance`

### Buscar presença por ID

- **GET** `/registrations/:registrationId/attendance/:attendanceId`

### Atualizar presença

- **PUT** `/registrations/:registrationId/attendance/:attendanceId`

```json
{
  "present": true,
  "notes": "Atualizado no Postman",
  "markedByUserId": "<admin_id>"
}
```

### Remover presença

- **DELETE** `/registrations/:registrationId/attendance/:attendanceId`

### Criar presença

- **POST** `/registrations/:registrationId/attendance`
- **Body (JSON):**

```json
{
  "eventSessionId": "<session_id>",
  "present": true,
  "markedByUserId": "<admin_id>"
}
```

---

## Palestrantes

### Criar palestrante

- **POST** `/speakers`
- **Body (JSON):**

```json
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "bio": "Especialista em IA",
  "institution": "Fatec"
}
```

**Resposta (201):**

```json
{
  "id": "<id do palestrante>",
  "name": "Maria Souza",
  "email": "maria@email.com",
  "eventIds": []
}
```

Se o e-mail já existir, a API retorna:

```json
{
  "error": "E-mail já cadastrado."
}
```

### Listar palestrantes

- **GET** `/speakers`

### Buscar palestrante por ID

- **GET** `/speakers/:id`

### Atualizar palestrante

- **PUT** `/speakers/:id`
- **Body (JSON):** (campos a atualizar)

Se a alteração tentar usar um e-mail já cadastrado, a API retorna:

```json
{
  "error": "E-mail já cadastrado."
}
```

### Remover palestrante

- **DELETE** `/speakers/:id`

---

## Inscrições

### Criar inscrição

- **POST** `/registrations`
- **Body (JSON):** (totalSessionsCount computed automatically if omitted; registrationDate defaults to now)

```json
{
  "participantId": "<id do usuário com role PARTICIPANTE>",
  "eventId": "<id do evento>",
  "totalSessionsCount": 3
}
```

**Resposta (201):**

```json
{
  "id": "<id da inscrição>",
  "participantId": "<id>",
  "eventId": "<id>",
  "status": "ATIVO",
  "registrationDate": "2026-05-18T21:37:34.139Z",
  "attendancePercent": 0,
  "attendedSessionsCount": 0,
  "totalSessionsCount": 3,
  "approvedForCertificate": false
}
```

**Erros comuns:**

```json
{
  "error": "Inscricao duplicada: este participante ja esta inscrito neste evento."
}
```

Se tentar inscrever em um evento com status diferente de `ATIVA`:

```json
{
  "error": "Inscrição só permitida em eventos com status ATIVA."
}
```

Se a capacidade máxima do evento foi atingida:

```json
{
  "error": "Capacidade do evento atingida."
}
```

Se o evento não existir:

```json
{
  "error": "Evento não encontrado."
}
```

### Listar inscrições

- **GET** `/registrations`

### Buscar inscrição por ID

- **GET** `/registrations/:id`

### Atualizar inscrição

- **PUT** `/registrations/:id`
- **Body (JSON):** (campos a atualizar)

### Remover inscrição

- **DELETE** `/registrations/:id`

---

## Certificados

### Upload de PDF do certificado

- **POST** `/certificates/upload`
- **Body (form-data):** campo `pdf` com arquivo PDF.

### Criar certificado

- **POST** `/certificates`
- **Body (JSON):** (verificationCode and issueDate auto-generated; attendancePercentAtIssue auto-computed)

```json
{
  "registrationId": "<id da inscrição>",
  "pdfUrl": "https://url.com/certificado.pdf",
  "issuedByAdminId": "<id do admin>"
}
```

> **Nota:** `verificationCode`, `issueDate`, e `attendancePercentAtIssue` são gerados automaticamente.

> **Regra de data:** `issueDate` e `expiresAt` aceitam datas ISO. Se enviados, são validados antes de persistir.

Se tentar criar um certificado para um `registrationId` que já possui certificado, será retornado:

```json
{
  "error": "Já existe um certificado para esta inscrição (registrationId)."
}
```

**Resposta (201):**

```json
{
  "id": "<id do certificado>",
  "registrationId": "<id da inscrição>",
  "pdfUrl": "https://url.com/certificado.pdf",
  "verificationCode": "ABC12345",
  "issueDate": "2026-05-19T16:00:00.000Z"
}
```

### Listar certificados

- **GET** `/certificates`

### Buscar certificado por ID

- **GET** `/certificates/:id`

### Atualizar certificado

- **PUT** `/certificates/:id`

```json
{
  "pdfUrl": "https://url.com/certificado-atualizado.pdf",
  "issuedByAdminId": "<id do admin>"
}
```

### Remover certificado

- **DELETE** `/certificates/:id`

---

## Associação evento-palestrante

> Observação: a relação é mantida por arrays (`Event.speakerIds` e `Speaker.eventIds`). Para testar a associação no Postman, atualize o evento com `speakerIds` ou o palestrante com `eventIds`.
> Para publicar o evento no mesmo `PUT`, envie `status: "ATIVA"` junto com `speakerIds`; a API valida o vínculo usando a lista enviada na própria requisição.

### Vincular palestrante a evento via Event

- **PUT** `/events/:id`
- **Body (JSON):** (enviar `speakerIds` com a lista atualizada e `status: "ATIVA"` quando quiser publicar)

```json
{
  "status": "ATIVA",
  "speakerIds": ["<speaker_id_1>", "<speaker_id_2>"]
}
```

### Verificar vínculo

- **GET** `/events/:id`
- **GET** `/speakers/:id`

---

> Substitua `<id ...>` pelos IDs reais retornados nas criações.
> Use o Postman para enviar as requisições, testar fluxos e validar respostas.

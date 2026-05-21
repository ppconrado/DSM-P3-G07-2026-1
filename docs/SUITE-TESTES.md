# SUITE DE TESTES

Documento atualizado para o backend atual de `back-end/`.

## Objetivo

- Validar as rotas reais expostas hoje.
- Cobrir o fluxo de associação `Event` ⇄ `Speaker`.
- Exercitar o smoke test e a suíte de integração com Mocha + Supertest.

## Execução

```bash
cd back-end
npm test
node ./scripts/smokeTests.js
```

## Cobertura atual

- `GET /`
- `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`
- `GET /events`, `POST /events`, `GET /events/:id`, `PUT /events/:id`, `DELETE /events/:id`
- `GET /speakers`, `POST /speakers`, `GET /speakers/:id`, `PUT /speakers/:id`, `DELETE /speakers/:id`
- `GET /registrations`, `POST /registrations`, `GET /registrations/:id`, `PUT /registrations/:id`, `DELETE /registrations/:id`
- `GET /events/:eventId/sessions`, `POST /events/:eventId/sessions`, `GET /events/:eventId/sessions/:id`, `PUT /events/:eventId/sessions/:id`, `DELETE /events/:eventId/sessions/:id`, `GET /events/:eventId/sessions/:sessionId/attendance`
- `GET /registrations/:registrationId/attendance`, `POST /registrations/:registrationId/attendance`, `GET /registrations/:registrationId/attendance/:attendanceId`, `PUT /registrations/:registrationId/attendance/:attendanceId`, `DELETE /registrations/:registrationId/attendance/:attendanceId`
- `GET /certificates`, `POST /certificates`, `GET /certificates/:id`, `PUT /certificates/:id`, `DELETE /certificates/:id`, `POST /certificates/upload`

## Regras de negócio cobertas

- `startDate` e `endDate` de eventos aceitam datas no formato `YYYY-MM-DD`.
- `sessionDate` de uma sessão deve ficar dentro do intervalo do evento, de forma inclusiva.
- Datas inválidas em eventos, sessões, presenças e certificados retornam `400` com mensagem clara.

## Cenários validados

- Criar evento e palestrante.
- Sincronizar `speakerIds` e `eventIds`.
- Criar usuário com role `PARTICIPANTE` e inscrição.
- Criar sessão e registrar presença por sessão.
  - Observação: marcação/edição/remoção de presença exige `markedByUserId` com perfil `ADMIN` (regra do memorial/UML).
  - Observação: a data da sessão deve respeitar o período do evento.
- Criar e consultar certificado.
- Fazer upload do PDF do certificado.

## Observações

- Não há validação pública de certificado.
- O backend usa as rotas sem prefixo extra.

# Resumo Executivo - Arquitetura do Sistema de Gerenciamento de Palestras

**Data**: Janeiro 2026  
**Status**: ✅ Arquitetura Finalizada e Documentada  
**Tech Stack**: Node.js + Express + MongoDB + Prisma ORM

---

## 1. Visão Geral

Sistema profissional de gerenciamento de eventos (palestras, workshops, cursos) com:

- ✅ Controle de presença granular (por sessão)
- ✅ Autoaprovação de certificados (≥75% de presença)
- ✅ Rastreabilidade completa (quem fez o quê e quando)
- ✅ Suporte a múltiplas sessões por evento
- ✅ Sistema de roles (Admin vs Participante)

---

## 2. Artefatos Entregues

### 2.1 Documentação de Arquitetura

| Arquivo                                           | Descrição                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/UML-Gerenciamento-Palestras-Estrito.drawio` | **DIAGRAMA UML OFICIAL** - 7 entidades com relacionamentos, cardinalidades, campos profissionais com PK/FK/unique/defaults |
| `docs/rotas-controllers-mapeamento.md`            | Mapeamento completo de endpoints REST, controllers, services e fluxo de dados                                              |
| `back-end/prisma/schema.prisma`                   | **Schema Prisma final** - Modelos, relações, enums, índices prontos para MongoDB                                           |
| `docs/RESUMO-ARQUITETURA-FINAL.md`                | Este arquivo - consolidação executiva                                                                                      |

---

## 3. Modelo de Dados Completo

### Entidades e Responsabilidades

#### 👤 **User** (Autenticação e autorização)

```
- id (PK), email (unique), passwordHash, phone
- role: ADMIN | PARTICIPANT (enum tipado)
- isActive (para soft delete)
- createdAt, updatedAt (auditoria)
```

**Relações**:

- 1:N → Event (admin cria eventos)
- 1:N → Speaker (admin cria palestrantes)
- 1:N → Registration (participant se inscreve)
- 1:N → Attendance (admin marca presença)
- 1:N → Certificate (admin emite certificados)

---

#### 🎤 **Speaker** (Palestrantes)

```
- id (PK), email (unique), name, bio, institution, phone
- createdAt, updatedAt
```

**Relações**:

- N:M ↔ Event (via `speakerIds`)

---

#### 📚 **Event** (Palestras/Cursos)

```
- id (PK), title (unique)
- description, startDate, endDate, location, type, capacity
- certificateRequiredPercent = 75 (padrão)
- status: CRIANDO | ATIVA | ENCERRADA | CANCELADA (enum)
- createdByAdminId (FK → User)
- createdAt, updatedAt
```

**Relações**:

- N:1 ← User (admin que criou)
- 1:N → EventSession (múltiplas aulas/datas)
- 1:N → Registration (participantes inscritos)
- N:M ↔ Speaker (via `eventIds`)
- 1:N → Certificate (certificados gerados)

---

#### 🗣️ **Associação Evento-Palestrante**

```
- Event.speakerIds (array de ObjectId)
- Speaker.eventIds (array de ObjectId)
- Atualização via PUT em Event ou Speaker
```

---

#### 📅 **EventSession** (Sessões/Aulas do Evento)

```
- id (PK), eventId (FK → Event)
- sessionDate, startTime, endTime, room
- createdAt, updatedAt
```

**Relações**:

- N:1 ← Event
- 1:N → Attendance (presença marcada por sessão)

**Propósito**: Viabiliza eventos com múltiplas sessões (ex: palestra quarta E sexta)

---

#### ✅ **Registration** (Inscrição de Participante em Evento)

```
- id (PK), participantId (FK), eventId (FK)
- status: ATIVO | CANCELADO | CONCLUIDO (enum)
- registrationDate, approvedAt
- attendancePercent (Decimal, calculado)
- attendedSessionsCount, totalSessionsCount
- approvedForCertificate (Boolean, padrão false)
- @@unique([participantId, eventId]) → 1 inscrição por participante/evento
- createdAt, updatedAt
```

**Relações**:

- N:1 ← User (participante)
- N:1 ← Event
- 1:N → Attendance (presença por sessão)
- 1:0..1 → Certificate (gerado apenas se approved)

**Lógica**:

- Participante se inscreve → status ATIVO
- Admin marca presença nas sessões → Attendance.present = true/false
  - Observação: apenas usuários com role `ADMIN` podem marcar, atualizar ou remover marcações de presença (campo `markedByUserId`).
- Sistema calcula attendancePercent = (attendedSessionsCount / totalSessionsCount) \* 100
- Se attendancePercent ≥ certificateRequiredPercent → approvedForCertificate = true
- Certificate gerado apenas se aprovado

---

#### 📍 **Attendance** (Controle de Presença Granular)

```
- id (PK), registrationId (FK), eventSessionId (FK)
- present (Boolean, padrão false)
- checkInAt, checkOutAt (DateTime optional)
- markedByUserId (FK → User, quem marcou)
- notes (observações do admin)
- @@unique([registrationId, eventSessionId]) → 1 presença por sessão/participante
- createdAt
```

**Relações**:

- N:1 ← Registration
- N:1 ← EventSession
- N:1 ← User (admin que marcou)

**Propósito**: Rastreabilidade detalhada - quem foi e quem marcou

---

#### 🎓 **Certificate** (Certificados Emitidos)

```
- id (PK), registrationId (unique - 1 certificado por inscrição)
- eventId (FK)
- verificationCode (unique - código para validação externa)
- issueDate, pdfUrl
- expiresAt (optional)
- attendancePercentAtIssue (Decimal - snapshots do % no momento da emissão)
  - Emissão: apenas `ADMIN` pode emitir certificados; o sistema exige `attendancePercent >= certificateRequiredPercent` ou `approvedForCertificate = true`.
- issuedByAdminId (FK → User)
- createdAt
- @@unique([registrationId]) → máximo 1 certificado por inscrição
- @@unique([verificationCode]) → código único para validação
```

**Relações**:

- 1 ← Registration (1:0..1)
- N:1 ← Event
- N:1 ← User (admin que emitiu)

**Propósito**: Entidade separada permite:

- Histórico e rastreabilidade
- Reemissão (se necessário)
- Validação externa por código
- Snapshot do % no momento da emissão (para auditoria)

---

## 4. Enums Tipados

```typescript
enum UserRole {
  ADMIN       // Gerencia eventos, palestrantes, aprova certificados
  PARTICIPANT // Se inscreve em eventos, recebe certificados
}

enum RegistrationStatus {
  ATIVO       // Inscrito e ativo
  CANCELADO   // Cancellou a inscrição
  CONCLUIDO   // Completou o evento
}

enum EventStatus {
  CRIANDO     // Em preparação
  ATIVA       // Aceitando inscrições
  ENCERRADA   // Evento finalizado
  CANCELADA   // Evento cancelado
}
```

---

## 5. Fluxo de Uso - Exemplo Prático

```
FASE 1: Setup
┌─────────────────────────────────────────────────────────┐
│ Admin cria evento                                        │
│ POST /events                                             │
│ → Event criado com status CRIANDO                        │
└─────────────────────────────────────────────────────────┘

FASE 2: Preparação
┌─────────────────────────────────────────────────────────┐
│ Admin cria palestrantes e vincula                        │
│ POST /speakers                                           │
│ PUT /events/:id  ou  PUT /speakers/:id                  │
│ → Arrays atualizados com speakerIds/eventIds            │
└─────────────────────────────────────────────────────────┘

FASE 3: Estrutura
┌─────────────────────────────────────────────────────────┐
│ Admin cria sessões do evento (ex: aulas)                │
│ (não há endpoint de sessões neste backend)               │
│ → totalSessionsCount é mantido pela aplicação            │
└─────────────────────────────────────────────────────────┘

FASE 4: Inscrição
┌─────────────────────────────────────────────────────────┐
│ Participante se inscreve                                 │
│ POST /registrations                                      │
│ → Registration criado com status ATIVO                   │
│ → attendancePercent = 0 (inicial)                        │
└─────────────────────────────────────────────────────────┘

FASE 5: Execução
┌─────────────────────────────────────────────────────────┐
│ Admin marca presença em cada sessão                      │
│ (não há controle de presença neste backend)              │
└─────────────────────────────────────────────────────────┘

FASE 6: Aprovação
┌─────────────────────────────────────────────────────────┐
│ Admin aprova para certificado (se % >= 75%)             │
│ (não há aprovação de certificado neste backend)         │
└─────────────────────────────────────────────────────────┘

FASE 7: Emissão
┌─────────────────────────────────────────────────────────┐
│ Sistema gera certificado                                 │
│ POST /certificates                                       │
│ → Certificate criado com verificationCode único          │
│ → pdfUrl informado/uploadado                              │
└─────────────────────────────────────────────────────────┘

FASE 8: Validação (Posterior)
┌─────────────────────────────────────────────────────────┐
│ Terceiros validam certificado                            │
│ GET /certificates/:id                                     │
│ → Certificate retornado                                   │
└─────────────────────────────────────────────────────────┘

FASE 9: Cierre
┌─────────────────────────────────────────────────────────┐
│ Admin encerra evento                                     │
│ PUT /events/:id                                          │
│ → Event atualizado                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Endpoints REST Consolidados

### Autenticação

- `GET /users` → Listar usuários
- `DELETE /users/:id` → Desativar usuário

### Eventos (Admin)

- `POST /events` → Criar evento
- `GET /events` → Listar eventos
- `GET /events/:id` → Detalhes do evento
- `PUT /events/:id` → Atualizar evento
- `DELETE /events/:id` → Remover evento

### Sessões (Admin)

- `GET /events/:eventId/sessions` → Listar sessões do evento
- `POST /events/:eventId/sessions` → Criar sessão
- `GET /events/:eventId/sessions/:id` → Obter sessão
- `PUT /events/:eventId/sessions/:id` → Atualizar sessão
- `DELETE /events/:eventId/sessions/:id` → Remover sessão
- `GET /events/:eventId/sessions/:sessionId/attendance` → Listar presenças da sessão

### Palestrantes (Admin)

- `POST /speakers` → Criar palestrante
- `GET /speakers` → Listar palestrantes
- `PUT /events/:id` ou `PUT /speakers/:id` → Sincronizar vínculo

### Inscrições

- `POST /registrations` → Criar inscrição
- `GET /registrations` → Listar inscrições
- `GET /registrations/:id` → Detalhe da inscrição
- `PUT /registrations/:id` → Atualizar inscrição
- `DELETE /registrations/:id` → Remover inscrição

### Presença

- `GET /registrations/:registrationId/attendance` → Listar presenças da inscrição
- `POST /registrations/:registrationId/attendance` → Criar presença (requer `markedByUserId` ADMIN)
- `GET /registrations/:registrationId/attendance/:attendanceId` → Obter presença
- `PUT /registrations/:registrationId/attendance/:attendanceId` → Atualizar presença (requer `markedByUserId` ADMIN)
- `DELETE /registrations/:registrationId/attendance/:attendanceId` → Remover presença (requer `markedByUserId` ADMIN)

### Certificados

- `GET /certificates` → Listar certificados
- `POST /certificates` → Criar certificado
- `GET /certificates/:id` → Detalhes do certificado
- `PUT /certificates/:id` → Atualizar certificado
- `DELETE /certificates/:id` → Remover certificado
- `POST /certificates/upload` → Upload do PDF

---

## 7. Decisões Arquiteturais Justificadas

### ✅ Por que `User` em vez de `Participant`?

- **Razão**: Reutilização - User é aplicável a ADMIN e PARTICIPANT
- **Benefício**: Menos models, lógica de auth centralizada
- **Implementação**: Field `role: UserRole` diferencia as responsabilidades

### ✅ Por que `EventSession` é necessário?

- **Razão**: Eventos frequentemente têm múltiplas aulas (quarta + sexta, por exemplo)
- **Benefício**: Controle de presença granular e real por sessão
- **Implementação**: Attendance associado a EventSession em vez de Event direto

### ✅ Por que `Certificate` é entidade separada?

- **Razão**: Escalabilidade - suporta reemissão, histórico, validação externa
- **Benefício**: Desacoplamento - presença e certificação são concerns separados
- **Implementação**: 1:0..1 com Registration (optional)

### ✅ Por que `Attendance.present` é `Boolean`?

- **Razão**: Precisão na auditoria - marca ou não marca apresentação
- **Benefício**: Facilita cálculo de percentual real (attended/total)\*100
- **Implementação**: Registration.attendancePercent é Decimal calculada

### ✅ Por que incluir `markedByUserId` em `Attendance`?

- **Razão**: Rastreabilidade - quem marcou a presença?
- **Benefício**: Auditoria completa do quem-fez-o-quê
- **Implementação**: FK opcional para User (admin que marcou)

### ✅ Por que `@@unique([registrationId, eventSessionId])`?

- **Razão**: Garantir que participante não marca presença 2x na mesma sessão
- **Benefício**: Integridade de dados
- **Implementação**: Constraint no MongoDB via Prisma

---

## 8. Índices para Performance

```prisma
// User
@@index([email])        // Busca por email rápida
@@index([role])         // Filtragem por role
@@index([isActive])     // Soft delete queries

// Event
@@index([createdByAdminId])  // Eventos de um admin
@@index([status])            // Filtragem por status
@@index([startDate])         // Ordenação temporal
@@index([endDate])           // Filtros de data

// Registration
@@unique([participantId, eventId])  // Validação de unicidade
@@index([participantId])            // Inscrições de um participante
@@index([eventId])                  // Inscrições de um evento
@@index([status])                   // Filtragem por status
@@index([approvedForCertificate])   // Certificáveis

// Attendance
@@unique([registrationId, eventSessionId])  // Garantia de unicidade
@@index([registrationId])                    // Presença de um participante
@@index([eventSessionId])                    // Presença de uma sessão
@@index([present])                           // Filtragem presentes/ausentes

// Certificate
@@unique([verificationCode])  // Validação rápida por código
@@index([eventId])            // Certificados de um evento
@@index([issuedByAdminId])    // Certificados emitidos por admin
```

---

## 9. Validações e Regras de Negócio

| Regra                                  | Onde Validar    | Implementação                              |
| -------------------------------------- | --------------- | ------------------------------------------ |
| Email único (User, Speaker)            | Server (Prisma) | @unique constraint                         |
| Participante inscreve 1x por evento    | Server (Prisma) | @@unique([participantId, eventId])         |
| Palestrante aparece 1x por evento      | Server (Prisma) | @@unique([eventId, speakerId])             |
| Presença marcada 1x por sessão         | Server (Prisma) | @@unique([registrationId, eventSessionId]) |
| Certificado criado com PDF e código    | Server (API)    | Validação em POST /certificates            |
| Apenas ADMIN aprova certificados       | Server (API)    | Middleware JWT role check                  |
| Apenas PARTICIPANT recebe certificados | Server (API)    | Lógica na geração                          |
| Apenas ADMIN marca presença            | Server (API)    | Middleware JWT role check                  |
| Código de verificação único            | Server (Prisma) | @unique constraint                         |

---

## 10. Segurança Implementada

### Autenticação

- JWT token (Bearer)
- Hash de passwords (bcrypt recomendado)
- Refresh tokens (opcional)

### Autorização

- Role-based access control (RBAC)
- ADMIN: acesso total a setup e aprovações
- PARTICIPANT: acesso a dados próprios

### Proteção de Dados

- Soft delete (isActive)
- Audit trail (createdAt, updatedAt)
- Who-did-what tracking (markedByUserId, issuedByAdminId)
- Verificação por código externo (verificationCode para públicos)

---

## 11. Próximas Etapas Após Aprovação

### Fase 1: Backend (Próximas 2 semanas)

1. Implementar controllers para cada entidade
2. Criar services com lógica de negócio
3. Implementar middleware de autenticação JWT
4. Criar validações de request/response
5. Testar com Postman/Insomnia
6. Documentar com Swagger/OpenAPI

### Fase 2: Cálculos Automáticos (1 semana)

1. Implementar `attendancePercent` calculator
2. Implementar `approvedForCertificate` auto-check
3. Testar: presença 74% vs 75% (edge case)

### Fase 3: Geração de Certificados (1 semana)

1. Integrar library de PDF (ex: PDFKit, html2pdf)
2. Criar template de certificado
3. Gerar verificationCode (UUID/hash)
4. Armazenar pdfUrl (local ou S3)

### Fase 4: Frontend (Paralelo ao Backend)

1. Telas de ADMIN (eventos, sessões, presença, aprovação)
2. Telas de PARTICIPANT (inscrição, acompanhamento, certificados)
3. Tela pública de validação de certificado

---

## 12. Checklist de Implementação

- [ ] Schema Prisma criado ✅ (já feito)
- [ ] Migrations geradas (`prisma migrate dev`)
- [ ] Seed data (usuários teste, eventos teste) — executar `npm run seed` no diretório `back-end`
- [ ] Controllers implementados (CRUD base)
- [ ] Services com regras de negócio
- [ ] JWT middleware
- [ ] Testes unitários (services)
- [ ] Testes de integração (endpoints)
- [ ] Geração de certificados PDF
- [ ] Documentação Swagger
- [ ] Variáveis de ambiente (.env)
- [ ] Testes com dados reais (Postman)

---

## 13. Contato com Diagrama Oficial

**Arquivo Draw.io**: `docs/UML-Gerenciamento-Palestras-Estrito.drawio`

Este documento (RESUMO-ARQUITETURA-FINAL.md) é a **representação textual** do diagrama oficial. Qualquer dúvida sobre relacionamentos, cardinalidades ou campos, consulte o `.drawio`.

---

## 14. Conclusão

✅ **Arquitetura pronta para implementação**

A estrutura atende:

- Requisitos de negócio (certificados por presença ≥75%)
- Boas práticas de engenharia (clean architecture, SOLID)
- Escalabilidade (suporte a N eventos, N sessões, N participantes)
- Rastreabilidade (auditoria completa)
- Segurança (RBAC, validação de dados)

Próximo passo: implementar controllers e services conforme mapeamento em `rotas-controllers-mapeamento.md`.

Comparativo

1. Registration com os dados do certificado

Vantagem: menos entidades e consultas mais simples.
Desvantagem: mistura inscrição, presença e emissão do certificado no mesmo lugar.
Funciona melhor quando o sistema é pequeno e o certificado é só um anexo da inscrição.
Fica menos flexível para segunda via, reemissão, histórico de certificados e auditoria. 2. Certificate como entidade separada

Vantagem: separa responsabilidades com mais clareza.
Registration fica com a participação e a apuração da elegibilidade.
Certificate fica com a emissão final do documento.
Modela melhor o fluxo real: inscrição -> presença -> aprovação -> certificado.
É mais fácil evoluir depois sem quebrar o modelo.

Registration representa o vínculo do participante com o evento.
Certificate representa um resultado gerado após validar a presença mínima.
Separar as duas entidades deixa o banco mais limpo e a regra dos 75% mais clara.

A minha defesa é a favor de criar a entidade Certificate, mas com um recorte bem específico: o Registration deve concentrar a elegibilidade e a apuração da presença, e o Certificate deve concentrar a emissão do documento final.

O argumento principal é de modelagem. Registration representa a inscrição e o vínculo do participante com o evento. Certificate representa uma saída do processo, isto é, um artefato gerado depois que a inscrição foi validada. São ciclos de vida diferentes. Quando você coloca os dados do certificado dentro de Registration, mistura “processo” com “resultado”, e isso enfraquece o modelo conceitual. Além disso, Certificate tende a ser opcional, porque nem toda inscrição gera certificado. Em um modelo separado, isso fica naturalmente representado com uma relação 1:0..1, o que é mais limpo e mais fácil de manter no banco.

Há também uma vantagem prática para o schema. Com Certificate separado, você consegue guardar controle de emissão, como verificationCode, issueDate, pdfUrl e até attendancePercentAtIssue, sem poluir Registration com campos que só fazem sentido depois da aprovação. Isso evita muitos nulos e deixa mais claro o fluxo: a presença é apurada em Attendance, consolidada em Registration, e se passar de 75% o Certificate é gerado. Se amanhã você quiser reemitir certificado, invalidar um código, guardar histórico de versões ou até permitir segunda via, a entidade separada escala melhor.

Dito isso, a sua orientação, Professor Fausto também faz sentido em um cenário mais simples. Se o sistema fosse muito enxuto e o certificado fosse apenas um complemento irrelevante da inscrição, colocar tudo em Registration reduziria o número de coleções e simplificaria consultas. Essa abordagem é pragmática quando o objetivo é entregar rápido e sem evolução futura. O problema é que ela costuma ficar restrita assim que aparecem regras como aprovação por frequência, emissão posterior, segunda via e rastreabilidade.

A posição profissional seria esta: manter Registration como base da matrícula e da apuração de presença, e criar Certificate como entidade própria, com uma relação opcional para Registration. Essa solução atende a regra dos 75% de forma mais limpa e deixa o modelo preparado para o schema Prisma sem misturar responsabilidades

como consultar os dados com Prisma Client usando o schema que você montou. A ideia é listar todos os participantes confirmados de um evento, junto com suas presenças por sessão e o certificado emitido (se existir):

```

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listarParticipantesConfirmados(eventId: string) {
const participantes = await prisma.registration.findMany({
where: {
eventId,
status: 'ATIVO', // ou CONCLUIDO, dependendo da lógica
},
include: {
participant: {
select: { id: true, name: true, email: true }
},
attendances: {
include: {
eventSession: {
select: { id: true, sessionDate: true, startTime: true, endTime: true }
}
}
},
certificate: true
}
})

return participantes
}

// Exemplo de uso
listarParticipantesConfirmados("EVENT_ID_AQUI").then(result => {
console.log(JSON.stringify(result, null, 2))
})

```

🔎 O que esse código retorna
Dados do participante: id, name, email.

Presenças: cada registro de Attendance com informações da sessão (sessionDate, startTime, endTime).

Certificado: se já emitido, retorna os dados (verificationCode, pdfUrl, etc.).

🎯 Observações
Você pode filtrar por status: 'CONCLUIDO' se quiser apenas os que já finalizaram o evento.

O campo approvedForCertificate também pode ser usado para garantir que só apareçam os que atingiram o percentual mínimo de presença.

Esse tipo de consulta é ideal para gerar relatórios ou dashboards administrativos.

📊 Exemplo: calcular percentual médio de presença por evento

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function calcularPresencaMedia(eventId: string) {
const resultado = await prisma.attendance.groupBy({
by: ['registrationId'],
where: {
eventSession: {
eventId: eventId
}
},
\_avg: {
present: true
},
\_count: {
id: true
}
})

// Mapeia para percentual de presença
const percentuais = resultado.map(r => ({
registrationId: r.registrationId,
totalSessions: r.\_count.id,
presencaMedia: r.\_avg.present ? r.\_avg.present \* 100 : 0
}))

return percentuais
}

// Exemplo de uso
calcularPresencaMedia("EVENT_ID_AQUI").then(res => {
console.log(res)
})

🔎 O que esse código faz
Agrupa Attendance por registrationId.

Calcula a média de presença (\_avg.present) e o total de sessões (\_count.id).

Retorna o percentual médio de presença de cada participante.

🎯 Aplicações práticas
Identificar quem atingiu o percentual mínimo (certificateRequiredPercent) para emissão de certificado.

Gerar relatórios de engajamento dos participantes.

Automatizar aprovação de certificados com base em presença.

Esse tipo de agregação é muito útil para dashboards administrativos e para validar regras de negócio diretamente no banco.

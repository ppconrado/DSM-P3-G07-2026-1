---

## 📂 Arquivo: `docs/estrutura-mongodb-prisma.md`

```markdown
# 📄 Estrutura de Documentos MongoDB com Prisma

Este documento descreve como os objetos/documentos são estruturados no MongoDB de acordo com o `schema.prisma`, e explica como o **Prisma Schema**, **Prisma Generate** e **Prisma Client** trabalham juntos para construir e manipular esses dados.

---

## Exemplos de Documentos

### Event

```json
{
  "_id": ObjectId("64f1a2b3c4d5e6f7a8b9c0d1"),
  "title": "Semana Acadêmica",
  "description": "Evento com palestras e workshops",
  "startDate": ISODate("2026-05-10"),
  "endDate": ISODate("2026-05-12"),
  "location": "Auditório Central",
  "type": "Palestra",
  "capacity": 100,
  "certificateRequiredPercent": 75,
  "status": "ATIVA",
  "speakerIds": [ObjectId("84f1a2b3c4d5e6f7a8b9c0d3")],
  "createdByAdminId": ObjectId("...")
}
```

### User (role PARTICIPANTE)

```json
{
  "_id": ObjectId("74f1a2b3c4d5e6f7a8b9c0d2"),
  "name": "José Paulo Conrado",
  "email": "jose@email.com",
  "passwordHash": "...",
  "phone": "+55 16 99999-9999",
  "role": "PARTICIPANTE",
  "isActive": true
}
```

### Speaker

```json
{
  "_id": ObjectId("84f1a2b3c4d5e6f7a8b9c0d3"),
  "name": "Prof. Ana Lima",
  "email": "ana@universidade.com",
  "bio": "Doutora em Inteligência Artificial",
  "institution": "Universidade Federal"
}
```

### Registration

```json
{
  "_id": ObjectId("94f1a2b3c4d5e6f7a8b9c0d4"),
  "participantId": ObjectId("74f1a2b3c4d5e6f7a8b9c0d2"),
  "eventId": ObjectId("64f1a2b3c4d5e6f7a8b9c0d1"),
  "registrationDate": ISODate("2026-03-15T10:00:00Z"),
  "status": "ATIVO"
}
```

### Certificate

```json
{
  "_id": ObjectId("a4f1a2b3c4d5e6f7a8b9c0d5"),
  "registrationId": ObjectId("94f1a2b3c4d5e6f7a8b9c0d4"),
  "verificationCode": "CERT-2026-XYZ123",
  "issueDate": ISODate("2026-03-15T11:00:00Z"),
  "pdfUrl": "/certificates/CERT-2026-XYZ123.pdf",
  "attendancePercentAtIssue": 85.5,
  "issuedByAdminId": ObjectId("..."),
  "expiresAt": null
}
```

### EventSession

```json
{
  "_id": ObjectId("c4f1a2b3c4d5e6f7a8b9c0d7"),
  "eventId": ObjectId("64f1a2b3c4d5e6f7a8b9c0d1"),
  "sessionDate": ISODate("2026-05-10"),
  "startTime": "09:00",
  "endTime": "12:00",
  "room": "Auditório A"
}
```

### Attendance

```json
{
  "_id": ObjectId("d4f1a2b3c4d5e6f7a8b9c0d8"),
  "registrationId": ObjectId("94f1a2b3c4d5e6f7a8b9c0d4"),
  "eventSessionId": ObjectId("c4f1a2b3c4d5e6f7a8b9c0d7"),
  "present": true,
  "checkInAt": ISODate("2026-05-10T09:05:00Z"),
  "markedByUserId": ObjectId("...")
}
```

### Associação Event ↔ Speaker via arrays

```json
{
  "_id": ObjectId("64f1a2b3c4d5e6f7a8b9c0d1"),
  "title": "Semana Acadêmica",
  "speakerIds": [
    ObjectId("84f1a2b3c4d5e6f7a8b9c0d3")
  ]
}
```

```json
{
  "_id": ObjectId("84f1a2b3c4d5e6f7a8b9c0d3"),
  "name": "Maria Souza",
  "eventIds": [
    ObjectId("64f1a2b3c4d5e6f7a8b9c0d1")
  ]
}
```

---

## ⚙️ Como os documentos são construídos

- **MongoDB** → apenas armazena os documentos em formato BSON/JSON.
- **Prisma Schema (`schema.prisma`)** → define os modelos e relações.
- **Prisma Generate** → cria o Prisma Client com base no schema.
- **Prisma Client (no código)** → usado para criar, consultar, atualizar e deletar documentos.

Exemplo de criação:

| Relação                    | Tipo           | Implementação                          |
| -------------------------- | -------------- | -------------------------------------- |
| Event – Registration       | **Composição** | Subdocumentos dentro de `events`       |
| Participant – Registration | **Associação** | Referência (`ObjectId`)                |
| Registration – Certificate | **Composição** | Subdocumento dentro de `registrations` |

Essa estrutura aproveita o melhor do MongoDB:

Composição → documentos aninhados (ideal para dados fortemente dependentes).

Associação → referências entre coleções (ideal para dados independentes).

orma coerente de modelar o relacionamento Event – Registration – Participant – Certificate em MongoDB:

🗂️ Coleções sugeridas

Events

```
{
  "_id": ObjectId("..."),
  "name": "Tech Conference 2026",
  "date": "2026-05-10",
  "location": "São Paulo",
  "registrations": [
    {
      "_id": ObjectId("..."),
      "participant_id": ObjectId("..."),
      "status": "confirmed",
      "certificate": {
        "issued": true,
        "issue_date": "2026-05-11"
      }
    }
  ]
}


```

Justificativa:

Aqui a composição entre Event e Registration é representada por documentos aninhados dentro de registrations.

Se o evento for removido, todas as inscrições desaparecem — comportamento natural da composição.

participants

```
{
  "_id": ObjectId("..."),
  "name": "José Conrado",
  "email": "jose@example.com",
  "registrations": [ObjectId("...")]
}

justificativa:

O participante existe independentemente das inscrições.

A relação é associação, representada por referências (ObjectId) para inscrições.
```

Registrations

```
{
  "_id": ObjectId("..."),
  "event_id": ObjectId("..."),          // referência ao evento (composição)
  "participant_id": ObjectId("..."),    // referência ao participante (associação)
  "registration_date": "2026-05-01",
  "status": "confirmed",                // valores possíveis: pending, confirmed, canceled
  "payment": {
    "method": "credit_card",
    "amount": 150.00,
    "paid": true
  },
  "certificate": {                      // composição dentro da inscrição
    "issued": true,
    "issue_date": "2026-05-11",
    "url": "https://example.com/certificates/12345"
  }
}

```

🔗 Relações e justificativas

| Campo            | Tipo         | Relação        | Justificativa                                                                                                               |
| ---------------- | ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `event_id`       | Referência   | **Composição** | A inscrição pertence a um evento específico. Se o evento for excluído, as inscrições associadas também devem ser removidas. |
| `participant_id` | Referência   | **Associação** | O participante pode existir sem inscrição, mas cada inscrição precisa estar vinculada a um participante.                    |
| `certificate`    | Subdocumento | **Composição** | O certificado depende da inscrição; se ela for removida, o certificado também é.                                            |

🧠 Observações de modelagem
Event–Registration: pode ser representado com subdocumentos dentro de events se o número de inscrições for pequeno.
Caso contrário, manter registrations como coleção separada é mais eficiente.

Participant–Registration: sempre melhor como referência, pois o participante pode ter várias inscrições em diferentes eventos.

Certificate: como é dependente da inscrição, o subdocumento dentro de registrations é ideal.

Essa estrutura é escalável, sem redundância e segue o princípio de composição e associação do memorial.

```ts
const participant = await prisma.user.create({
  data: {
    name: 'José Paulo Conrado',
    email: 'jose@email.com',
    passwordHash: '', // ou hashed
    phone: '+55 16 99999-9999',
    role: 'PARTICIPANTE',
  },
});

// Criar inscrição separadamente
const registration = await prisma.registration.create({
  data: {
    participantId: participant.id,
    eventId: '64f1a2b3c4d5e6f7a8b9c0d1',
    totalSessionsCount: 3,
  },
});
```

---

## 🔍 Consultas com Prisma Client

### Buscar (Find)

```ts
const participants = await prisma.user.findMany({
  where: { role: 'PARTICIPANTE' },
});
const participant = await prisma.user.findUnique({
  where: { id: '64f1a2b3c4d5e6f7a8b9c0d1' },
});

// Buscar inscrições de um participante
const registrations = await prisma.registration.findMany({
  where: { participantId: '64f1a2b3c4d5e6f7a8b9c0d1' },
  include: { event: true },
});
```

### Atualizar (Update)

```ts
const updatedParticipant = await prisma.user.update({
  where: { id: '74f1a2b3c4d5e6f7a8b9c0d2' },
  data: { phone: '+55 16 98888-7777' },
});
```

### Deletar (Delete)

```ts
await prisma.user.delete({
  where: { id: '74f1a2b3c4d5e6f7a8b9c0d2' },
});
```

---

## 🔄 Fluxo Visual

```mermaid
flowchart TD
    A[Prisma Schema (.prisma)] --> B[npx prisma generate]
    B --> C[Prisma Client JS]
    C --> D[Aplicação Node.js]
    D --> E[Operações com o modelo Event]
```

---

## ✅ Resumindo

- **Prisma Schema** → define os modelos e relações.
- **Prisma Generate** → cria o Prisma Client.
- **Prisma Client + seu código** → constroem, consultam, atualizam e deletam documentos.
- **MongoDB** → apenas armazena os documentos criados.

```

---

👉 Agora você pode copiar **todo esse bloco** e salvar em `docs/estrutura-mongodb-prisma.md`.

Quer que eu prepare também um **segundo arquivo `.md`** só com exemplos de queries avançadas (`include`, `select`, filtros de relação) para complementar sua documentação?
```

Perfeito, vamos criar um **segundo arquivo `.md`** focado apenas em **queries avançadas com Prisma Client**, para complementar sua documentação. Assim você terá um guia prático tanto para os documentos quanto para manipulação de dados.

---

## 📂 Arquivo: `docs/prisma-queries-avancadas.md`

````markdown
# 🔎 Queries Avançadas com Prisma Client

Este documento complementa a documentação principal (`estrutura-mongodb-prisma.md`) e mostra exemplos de consultas mais avançadas usando o **Prisma Client** com MongoDB.

---

## 📄 Buscar com `include`

### Buscar inscrições e incluir dados do participante e do evento

```ts
const registrations = await prisma.registration.findMany({
  include: {
    participant: true,
    event: true,
  },
});
```
````

### Buscar eventos e incluir palestrantes (via arrays)

```ts
const events = await prisma.event.findMany({
  include: {
    speakerIds: true,
  },
});
```

---

## 📄 Buscar com `select`

### Buscar apenas nome e email de participantes

```ts
const participants = await prisma.user.findMany({
  where: { role: 'PARTICIPANTE' },
  select: {
    name: true,
    email: true,
  },
});
```

### Buscar apenas nome e status das inscrições

```ts
const registrations = await prisma.registration.findMany({
  select: {
    registrationDate: true,
    status: true,
  },
});
```

---

## 📄 Filtros de Relação

### Buscar participantes que tenham inscrições ativas

```ts
const activeParticipants = await prisma.user.findMany({
  where: {
    role: 'PARTICIPANTE',
    registrations: {
      some: { status: 'ATIVO' },
    },
  },
});
```

### Buscar eventos com inscrições concluídas

```ts
const pendingEvents = await prisma.event.findMany({
  where: {
    registrations: {
      some: { status: 'CONCLUIDO' },
    },
  },
});
```

---

## 📄 Ordenação e Paginação

### Buscar participantes ordenados por nome

```ts
const participants = await prisma.user.findMany({
  where: { role: 'PARTICIPANTE' },
  orderBy: { name: 'asc' },
});
```

### Buscar eventos com paginação (primeiros 5)

```ts
const events = await prisma.event.findMany({
  take: 5,
  skip: 0,
});
```

---

## ✅ Resumindo

- Use **`include`** para trazer dados relacionados.
- Use **`select`** para escolher apenas os campos necessários.
- Use **filtros de relação** (`some`, `none`, `every`) para consultar dados conectados.
- Use **`orderBy`**, **`take`** e **`skip`** para ordenação e paginação.

Essas técnicas tornam suas queries mais eficientes e organizadas.

```

---

👉 Agora você tem dois arquivos `.md` bem organizados:

1. `docs/estrutura-mongodb-prisma.md` → Estrutura dos documentos e explicações do fluxo.
2. `docs/prisma-queries-avancadas.md` → Exemplos práticos de queries avançadas.

Quer que eu prepare também um **terceiro arquivo `.md`** com **boas práticas de modelagem e performance no Prisma + MongoDB**?
```

Ótimo, vamos fechar o ciclo da sua documentação criando um **terceiro arquivo `.md`** com **boas práticas de modelagem e performance no Prisma + MongoDB**. Assim você terá um guia completo: estrutura, queries básicas, queries avançadas e agora recomendações de uso.

---

## 📂 Arquivo: `docs/prisma-boas-praticas.md`

````markdown
# 🚀 Boas Práticas de Modelagem e Performance com Prisma + MongoDB

Este documento reúne recomendações para melhorar a modelagem de dados e otimizar consultas usando Prisma com MongoDB.

---

## 📄 Modelagem de Dados

- **Use ObjectId para chaves primárias**  
  Defina `@id @default(auto()) @map("_id") @db.ObjectId` para consistência com MongoDB.

- **Relacione entidades com clareza**
  - `Participant` ↔ `Registration` (1:N)
  - `Event` ↔ `Registration` (1:N)
  - `Registration` ↔ `Certificate` (1:1)
  - `Event` ↔ `Speaker` via arrays `speakerIds` / `eventIds` (N:N)

- **Enums para status**
- Use enums (`RegistrationStatus`, `EventStatus`, `UserRole`) para evitar inconsistências de texto.

- **Separar documentos grandes**  
  Evite embutir dados pesados (ex.: certificados em PDF) dentro de inscrições. Prefira coleções separadas.

---

## ⚙️ Performance

- **Selecione apenas o necessário (`select`)**
  ```ts
  const participants = await prisma.user.findMany({
    where: { role: 'PARTICIPANTE' },
    select: { name: true, email: true },
  });
  ```
````

- **Inclua relações com cuidado (`include`)**  
  Use apenas quando precisar dos dados relacionados. Evite trazer tudo sempre.

- **Paginação (`take` e `skip`)**

  ```ts
  const events = await prisma.event.findMany({
    take: 10,
    skip: 20,
  });
  ```

- **Filtros de relação (`some`, `none`, `every`)**
  ```ts
  const activeParticipants = await prisma.user.findMany({
    where: { role: 'PARTICIPANTE' },
    where: { registrations: { some: { status: 'ATIVO' } } },
  });
  ```

---

## 🔒 Boas Práticas Gerais

- **Valide dados antes de inserir**  
  Garanta que emails, datas e códigos de certificado sejam consistentes.

- **Use índices no MongoDB**  
  Crie índices em campos consultados com frequência (ex.: `eventId`, `participantId`, `status`).

- **Evite overfetching**  
  Não traga dados desnecessários em consultas. Isso reduz custo e aumenta velocidade.

- **Manutenção de dados**
  - Use `deleteMany` para limpar registros antigos.
  - Use `updateMany` para atualizações em lote.

---

## ✅ Resumindo

- Modele entidades de forma clara e normalizada.
- Use `select`, `include`, `take`, `skip` para consultas eficientes.
- Crie índices no MongoDB para melhorar performance.
- Evite documentos excessivamente grandes ou redundantes.

```

---

👉 Agora você tem três arquivos `.md` bem organizados:

1. `docs/estrutura-mongodb-prisma.md` → Estrutura dos documentos e explicações do fluxo.
2. `docs/prisma-queries-avancadas.md` → Exemplos práticos de queries avançadas.
3. `docs/prisma-boas-praticas.md` → Boas práticas de modelagem e performance.

Quer que eu prepare um **quarto arquivo `.md`** com **exemplos de erros comuns e como evitá-los** no uso de Prisma + MongoDB?
```

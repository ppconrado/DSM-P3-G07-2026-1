# Guia de Migração: Schema Antigo → Schema Novo

## Resumo das Mudanças

O schema foi **redesenhado completamente** para atender o diagrama UML profissional com suporte a múltiplas sessões, controle de presença granular e certificação automática.

---

## Mudanças Principais

### ❌ Removido

| Model Antigo                  | Motivo                      | Substituído por                                                                    |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `Participant`                 | Redundante com User         | `User` com `role: PARTICIPANT`                                                     |
| Campos genéricos em `Event`   | Falta de status e rastreio  | Expandido com `status`, `certificateRequiredPercent`, `createdByAdminId`           |
| Sem `EventSession`            | Não suportava multi-sessão  | Adicionado `EventSession`                                                          |
| Sem `Attendance`              | Não havia controle granular | Adicionado para presença por sessão                                                |
| `RegistrationStatus.PENDENTE` | Simplificado                | Agora: ATIVO, CANCELADO, CONCLUIDO                                                 |
| Sem campos de presença        | Registro simples            | Adicionado: `attendancePercent`, `attendedSessionsCount`, `approvedForCertificate` |
| Sem auditoria de certificados | Sem rastreio                | Adicionado: `attendancePercentAtIssue`, `issuedByAdminId`                          |

---

## Mapeamento das Mudanças

### User (era Participant)

**Antes:**

```prisma
model Participant {
  id            String  @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  email         String
  registration  String  // undefined: o que é isso?
  course        String
  phone         String?
  registrations Registration[]
}
```

**Depois:**

```prisma
model User {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  name          String   @db.String
  email         String   @unique @db.String
  passwordHash  String   @db.String  // Adicionado para autenticação
  phone         String?  @db.String
  role          UserRole @default(PARTICIPANT)  // ADMIN ou PARTICIPANT
  isActive      Boolean  @default(true)  // Soft delete
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Agora pode criar eventos (se ADMIN)
  createdEvents Event[]
  registrations Registration[] @relation("ParticipantRegistrations")
  // ... mais relações
}
```

**Por quê?**: User é mais genérico e suporta tanto admin quanto participante

---

### Event

**Antes:**

```prisma
model Event {
  id            String  @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  description   String
  startDate     DateTime
  endDate       DateTime
  location      String
  type          String
  registrations Registration[]
  speakerIds    String[] @db.ObjectId
}
```

**Depois:**

```prisma
model Event {
  id                         String      @id @default(auto()) @map("_id") @db.ObjectId
  title                      String      @unique @db.String
  description                String?     @db.String
  startDate                  DateTime    @db.Date
  endDate                    DateTime    @db.Date
  location                   String      @db.String
  type                       String      @db.String // ex: "Palestra", "Workshop", "Curso"
  capacity                   Int         @db.Int
  certificateRequiredPercent Int         @default(75)
  status                     EventStatus @default(CRIANDO)  // Novo: CRIANDO/ATIVA/ENCERRADA/CANCELADA
  createdByAdminId           String      @db.ObjectId
  createdAt                  DateTime    @default(now())
  updatedAt                  DateTime    @updatedAt

  createdByAdmin User        @relation(fields: [createdByAdminId], references: [id])
  sessions       EventSession[]  // Novo: múltiplas sessões
  registrations  Registration[]
  speakerIds     String[]     @db.ObjectId
}
```

**Por quê?**:

- Controle de ciclo de vida (status)
- Rastreabilidade (createdByAdminId)
- Certificação automática (certificateRequiredPercent)
- Multi-sessão (sessions array)

---

### Associação Evento-Palestrante por arrays

```prisma
model Event {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  ...
  speakerIds String[] @db.ObjectId
}

model Speaker {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  ...
  eventIds  String[]  @db.ObjectId
}
```

**Por quê?**: onDelete Cascade mais explícito + índices para performance

---

### EventSession (NOVO)

**Antes:** (não existia)

**Depois:**

```prisma
model EventSession {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  eventId     String   @db.ObjectId
  sessionDate DateTime @db.Date
  startTime   String   @db.String  // "09:00"
  endTime     String   @db.String  // "12:00"
  room        String?  @db.String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  attendances Attendance[]

  @@index([eventId])
  @@index([sessionDate])
}
```

**Por quê?**: Sistema precisa saber **qual sessão** cada participante compareceu. Exemplo:

- Palestra de IA pode ser quarta (09:00-12:00, sala A) e sexta (14:00-17:00, sala B)
- Admin precisa marcar presença separadamente para cada

---

### Registration (Aprimorado)

**Antes:**

```prisma
model Registration {
  id               String     @id @default(auto()) @map("_id") @db.ObjectId
  participant      Participant @relation(fields: [participantId], references: [id])
  participantId    String     @db.ObjectId
  event            Event      @relation(fields: [eventId], references: [id])
  eventId          String     @db.ObjectId
  registrationDate DateTime   // Sem default!
  status           RegistrationStatus
  certificate      Certificate?

  @@unique([eventId, participantId])
}

enum RegistrationStatus {
  ATIVO
  PENDENTE
  CANCELADO
}
```

**Depois:**

```prisma
model Registration {
  id                      String             @id @default(auto()) @map("_id") @db.ObjectId
  participantId           String             @db.ObjectId
  eventId                 String             @db.ObjectId
  status                  RegistrationStatus @default(ATIVO)
  registrationDate        DateTime           @default(now())
  attendancePercent       Float              @default(0)
  attendedSessionsCount   Int                @default(0)  // Novo
  totalSessionsCount      Int
  approvedForCertificate  Boolean            @default(false)  // Novo
  approvedAt              DateTime?  // Novo
  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  participant User        @relation("ParticipantRegistrations", fields: [participantId], references: [id])
  event       Event       @relation(fields: [eventId], references: [id])
  attendances Attendance[]  // Novo
  certificate Certificate?

  @@unique([participantId, eventId])
  @@index([participantId])
  @@index([eventId])
  @@index([status])
  @@index([approvedForCertificate])
}

enum RegistrationStatus {  // Mudou
  ATIVO
  CANCELADO
  CONCLUIDO  // Era PENDENTE
}
```

**Por quê?**:

- Presença em % calcula automaticamente: `(attendedSessionsCount / totalSessionsCount) * 100`
- Aprovação explícita: `approvedForCertificate` marca se pode gerar certificado
- Status PENDENTE removido: participante está ATIVO ou CANCELADO
- Rastreio: approvedAt diz quando foi aprovado

---

### Attendance (NOVO)

**Antes:** (não existia)

**Depois:**

```prisma
model Attendance {
  id             String    @id @default(auto()) @map("_id") @db.ObjectId
  registrationId String    @db.ObjectId
  eventSessionId String    @db.ObjectId
  present        Boolean   @default(false)
  checkInAt      DateTime?
  checkOutAt     DateTime?
  markedByUserId String?   @db.ObjectId
  notes          String?   @db.String
  createdAt      DateTime  @default(now())

  registration   Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  eventSession   EventSession @relation(fields: [eventSessionId], references: [id], onDelete: Cascade)
  markedByUser   User?        @relation("MarkedByAdmin", fields: [markedByUserId], references: [id])

  @@unique([registrationId, eventSessionId])
  @@index([registrationId])
  @@index([eventSessionId])
  @@index([present])
}
```

**Por quê?**:

- Marca presença per-sessão (não just sim/não global)
- Rastreabilidade: markedByUserId = quem marcou (admin)
- Check-in/out timestamps (opcional, para biometria futura)
- Notas (obs do admin sobre a presença)

---

### Certificate (Aprimorado)

**Antes:**

```prisma
model Certificate {
  id               String       @id @default(auto()) @map("_id") @db.ObjectId
  registration     Registration @relation(fields: [registrationId], references: [id])
  registrationId   String       @unique @db.ObjectId
  verificationCode String  // Sem @unique!
  issueDate        DateTime
  pdfUrl           String
}
```

**Depois:**

```prisma
model Certificate {
  id                       String   @id @default(auto()) @map("_id") @db.ObjectId
  registrationId           String   @unique @db.ObjectId
  verificationCode         String   @unique @db.String
  issueDate                DateTime
  pdfUrl                   String   @db.String
  expiresAt                DateTime?
  attendancePercentAtIssue Float
  issuedByAdminId          String   @db.ObjectId
  createdAt                DateTime @default(now())

  registration             Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  registration             Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  issuedByAdmin            User         @relation(fields: [issuedByAdminId], references: [id], onDelete: Restrict)

  @@unique([registrationId])
  @@unique([verificationCode])
  @@index([verificationCode])
  @@index([eventId])
  @@index([issuedByAdminId])
}
```

**Por quê?**:

- `verificationCode` agora é `@unique` para validação externa rápida
- `attendancePercentAtIssue` snapshots o % no momento (auditoria)
- `issuedByAdminId` rastreia quem emitiu (legal)
- `eventId` permite queries "certificados deste evento"
- `expiresAt` para certificados que expiram (se necessário)

---

## Enums Adicionados

### UserRole (NOVO)

```prisma
enum UserRole {
  ADMIN       // Acesso total a eventos
  PARTICIPANT // Acesso a inscrições e certificados
}
```

### EventStatus (NOVO)

```prisma
enum EventStatus {
  CRIANDO     // Preparando
  ATIVA       // Aceitando inscrições
  ENCERRADA   // Finalizado
  CANCELADA   // Cancelado
}
```

### RegistrationStatus (MODIFICADO)

```prisma
// Antes
enum RegistrationStatus {
  ATIVO
  PENDENTE    ← REMOVIDO
  CANCELADO
}

// Depois
enum RegistrationStatus {
  ATIVO       // Inscrito
  CANCELADO   // Cancelou
  CONCLUIDO   // Completou evento
}
```

---

## Procedimento de Migração

### Passo 1: Backup

```bash
# Se tiver dados no MongoDB já, backed up:
mongodump --uri "mongodb://..." --out backup_$(date +%Y%m%d)
```

### Passo 2: Atualizar schema.prisma

- Substitua o arquivo `back-end/prisma/schema.prisma` pelo novo
- ou copie o conteúdo novo para o arquivo existente

### Passo 3: Gerar Migração

```bash
cd back-end
npx prisma migrate dev --name init_new_schema
```

### Passo 4: Seed (Popular dados de teste)

Criar arquivo `back-end/scripts/seed.js` e executar com `npm run seed`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Admin user
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Teste',
      email: 'admin@test.com',
      passwordHash: 'hash_aqui',
      role: 'ADMIN',
    },
  });

  // Participant user
  const participant = await prisma.user.create({
    data: {
      name: 'Participant Teste',
      email: 'participant@test.com',
      passwordHash: 'hash_aqui',
      role: 'PARTICIPANT',
    },
  });

  // Event
  const event = await prisma.event.create({
    data: {
      title: 'Workshop IA',
      description: 'Introdução a Inteligência Artificial',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-15'),
      location: 'Auditório Principal',
      type: 'Workshop',
      certificateRequiredPercent: 75,
      status: 'ATIVA',
      createdByAdminId: admin.id,
    },
  });

  // EventSession
  const session1 = await prisma.eventSession.create({
    data: {
      eventId: event.id,
      sessionDate: new Date('2026-02-01'),
      startTime: '09:00',
      endTime: '12:00',
      room: 'Sala A',
    },
  });

  // Registration
  const registration = await prisma.registration.create({
    data: {
      participantId: participant.id,
      eventId: event.id,
      status: 'ATIVO',
      totalSessionsCount: 1,
    },
  });

  // Attendance
  await prisma.attendance.create({
    data: {
      registrationId: registration.id,
      eventSessionId: session1.id,
      present: true,
      markedByUserId: admin.id,
    },
  });

  console.log('Seed concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Passo 5: Testar

```bash
npx prisma studio  # Visualizar dados
npm test            # Rodar testes
```

---

## O que Muda no Backend

### Controllers desatualizados

- ~~`participantsController.js`~~ → deletar ou renomear para `usersController.js`
- `registrationsController.js` → adicionar lógica de presença
- `eventsController.js` → adicionar `status`, `certificateRequiredPercent`, `sessions`
- **Atual**: `eventsController.js` e `speakersController.js` sincronizam `speakerIds`/`eventIds`

### Services desatualizados

- ~~`participantService.js`~~ → `userService.js`
- **Atual**: `certificateFileService.js` para upload do PDF

### Routes desatualizadas

- `/participants` → `/users`
- `/registrations` → CRUD simples
- `/events/:id` e `/speakers/:id` → sincronização da relação N:N por arrays
- `/certificates/upload` → upload do PDF

---

## Checklist de Migração

- [ ] Backup de dados existentes (se houver)
- [ ] Arquivo schema.prisma atualizado
- [ ] `prisma migrate dev` executado com sucesso
- [ ] `npm run seed` executado com sucesso
- [ ] Verificar dados em `prisma studio`
- [ ] Controllers renomeados/criados
- [ ] Services atualizados com nova lógica
- [ ] Routes mapeadas conforme mapeamento
- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Variáveis .env corretas
- [ ] Produção testada

---

## Dúvidas Frequentes

**P: Posso migrar dados antigos de Participant para User?**  
R: Sim, mas será uma migração de dados (script separado) além da mudança de schema.

**P: Os endpoints antigos continuam funcionando?**  
R: Não, precisam ser reescritos conforme novo schema.

**P: Posso ter User.role null?**  
R: Não, tem default PARTICIPANT. Se quiser admin, crie com role ADMIN.

**P: Posso deletar EventSession?**  
R: Com onDelete: Cascade, todos os Attendance associados também deletam.

**P: O que é `updatedAt`?**  
R: Campo automático que Prisma atualiza toda vez que o registro é modificado.

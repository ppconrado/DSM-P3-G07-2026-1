## Dinâmica do Participante no Sistema

### 1. Cadastro do participante

- O participante acessa o sistema e preenche um formulário com seus dados (nome, e-mail, matrícula, curso, telefone).
- Após o cadastro, o sistema gera um id único (no Prisma/MongoDB é um ObjectId mapeado) para o participante.
- Esse id é usado em todas as transações futuras desse usuário.

### 2. Autenticação (não implementada)

- O participante ainda não autentica neste backend.

### 3. Visualização de eventos

- O participante pode visualizar a lista de eventos (palestras, workshops, minicursos), sessões e palestrantes.

### 4. Inscrição em eventos (Registration)

- Para se inscrever, o participante seleciona o evento e cria uma `Registration` que referencia `participantId` e `eventId`.
- Cada `Registration` possui `status` (ATIVO, CANCELADO, CONCLUIDO) e `registrationDate`.
- Um participante pode ter várias `Registration`, mas apenas uma por `eventId` (validação na aplicação).

### 5. Participação e certificados

- Após validação de presença, o sistema gera um `Certificate` vinculado à `Registration`.
- O certificado contém código de verificação e link para download/validação.

### 6. Consulta

- Participantes podem listar suas `registrations` e baixar certificados.

---

# Funcionamento do Sistema de Gerenciamento de Eventos Acadêmicos

## Visão Geral

O backend é implementado em Node.js + Express, usando Prisma como ORM com `provider = "mongodb"`. Todas as entidades persistem em coleções MongoDB; relações N:N entre `Event` e `Speaker` são representadas por arrays de ids em cada documento (`Event.speakerIds: String[]` e `Speaker.eventIds: String[]`). A sincronização entre esses arrays é responsabilidade da camada de aplicação.

## Principais decisões importantes

- Banco: MongoDB (obrigatório).
- ORM: Prisma (MongoDB provider).
- Representação N:N (Event ⇄ Speaker): por listas de ids nas duas coleções (arrays de `String`/ObjectId).
- A camada de aplicação deve cuidar de manter `Event.speakerIds` e `Speaker.eventIds` consistentes (criação, atualização e remoção).

## Fluxo do Sistema (resumido)

1. Admin cria/edita/exclui eventos e palestrantes.
2. Admin vincula um `Speaker` a um `Event` — a API atualiza `Event.speakerIds` e `Speaker.eventIds`.
3. Participante realiza inscrição (`Registration`) — registro com `participantId` e `eventId`.
4. Admin valida presença e gera `Certificate` ligado à `Registration`.

## Regras de negócio recomendadas

- Ao publicar um `Event` (status ATIVA), validar que exista pelo menos uma `session` e pelo menos um `speaker` associado.
- Evitar inscrições duplicadas: uma `Registration` por par (`participantId`, `eventId`).
- Ao remover um `Event` ou `Speaker`, a aplicação deve limpar referências (remover id de arrays e/ou remover `registrations`/`certificates` relacionados), conforme política de negócio.

## Representação das entidades (Prisma / Mongo mapping)

- `Event`
  - `id: String @id @map("_id") @default(auto()) @db.ObjectId`
  - `title, description, startDate, endDate, location, type, status` etc.
  - `speakerIds: String[]` — lista de ids (`Speaker.id`) como strings (ObjectId).

- `Speaker`
  - `id: String @id @map("_id") @default(auto()) @db.ObjectId`
  - `name, email, bio, institution` etc.
  - `eventIds: String[]` — lista de ids (`Event.id`).

- `Registration`
  - `id: String @id @map("_id") @default(auto()) @db.ObjectId`
  - `participantId: String`, `eventId: String`, `registrationDate`, `status` (enum).

- `Certificate`
  - `id`, `registrationId`, `issueDate`, `pdfUrl`, `verificationCode`, etc.

Exemplo de campo enum no Prisma:

```prisma
enum RegistrationStatus {
  ATIVO
  CANCELADO
  CONCLUIDO
}
```

## Como sincronizar arrays (exemplo de operações que a aplicação deve realizar)

- Adicionar `speaker` a `event`:
  1. Ler `event` e `speaker` por `id`.
  2. Se `speakerId` não estiver em `event.speakerIds`, atualizar `event.speakerIds` adicionando o id.
  3. Se `eventId` não estiver em `speaker.eventIds`, atualizar `speaker.eventIds` adicionando o id.

- Remover `speaker` de `event`:
  1. Atualizar `event.speakerIds` removendo o `speakerId`.
  2. Atualizar `speaker.eventIds` removendo o `eventId`.

Observação: usamos operações atômicas na aplicação (ler, modificar, gravar) e tentamos minimizar condições de corrida; se necessário, implemente _retry_ ou checagens adicionais.

## Exemplos práticos (Prisma Client)

Adicionar speakerId a um event (exemplo simplificado):

```js
// ler
const event = await prisma.event.findUnique({ where: { id: eventId } });
const speaker = await prisma.speaker.findUnique({ where: { id: speakerId } });
// evitar duplicata
if (!event.speakerIds?.includes(speakerId)) {
  await prisma.event.update({
    where: { id: eventId },
    data: { speakerIds: { set: [...(event.speakerIds || []), speakerId] } },
  });
}
if (!speaker.eventIds?.includes(eventId)) {
  await prisma.speaker.update({
    where: { id: speakerId },
    data: { eventIds: { set: [...(speaker.eventIds || []), eventId] } },
  });
}
```

Remover associação:

```js
await prisma.event.update({
  where: { id: eventId },
  data: {
    speakerIds: {
      set: (event.speakerIds || []).filter((s) => s !== speakerId),
    },
  },
});
await prisma.speaker.update({
  where: { id: speakerId },
  data: {
    eventIds: { set: (speaker.eventIds || []).filter((e) => e !== eventId) },
  },
});
```

## Estrutura de coleções (MongoDB) — exemplos atualizados

### `events` (exemplo simplificado)

```json
{
  "_id": ObjectId("74f1a2b3c4d5e6f7a8b9c0d2"),
  "title": "Semana Acadêmica",
  "description": "Evento com palestras e workshops",
  "startDate": ISODate("2026-05-10T00:00:00Z"),
  "endDate": ISODate("2026-05-12T23:59:59Z"),
  "location": "Auditório Central",
  "type": "Presencial",
  "speakerIds": ["84f1a2b3c4d5e6f7a8b9c0d3"],
  "sessionIds": ["..."],
  "registrationIds": ["94f1a2b3c4d5e6f7a8b9c0d4"]
}
```

### `speakers` (exemplo)

```json
{
  "_id": ObjectId("84f1a2b3c4d5e6f7a8b9c0d3"),
  "name": "Prof. Ana Lima",
  "email": "ana@universidade.com",
  "institution": "Universidade Federal",
  "bio": "Doutora em Inteligência Artificial",
  "eventIds": ["74f1a2b3c4d5e6f7a8b9c0d2"]
}
```

### `registrations` (exemplo)

```json
{
  "_id": ObjectId("94f1a2b3c4d5e6f7a8b9c0d4"),
  "participantId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "eventId": "74f1a2b3c4d5e6f7a8b9c0d2",
  "registrationDate": ISODate("2026-03-15T10:00:00Z"),
  "status": "ATIVO"
}
```

## Observações finais

- A principal responsabilidade adicional desta versão é manter arrays sincronizados; o banco não impõe integridade referencial entre arrays, então a aplicação deve garantir consistência.
- Mantemos enums no Prisma para validação de `status` e outros campos controlados.
- Se preferir, podemos adicionar scripts de `seed` e uma coleção de migração que limpe/inicie os arrays para evitar estados inconsistentes durante a transição.

---

ATENÇÃO: instalar a extensão `bierner.markdown-mermaid` no VS Code para visualizar blocos Mermaid inline.

### 5. Coleção: certificates

```
{
  "_id": ObjectId("..."),
  "registrationId": ObjectId("..."),
  "verificationCode": "CERT-2026-XYZ123",
  "pdfUrl": "/certificates/CERT-2026-XYZ123.pdf",
  "issueDate": ISODate("2026-03-15T11:00:00Z")
}

{
  "_id": ObjectId("a4f1a2b3c4d5e6f7a8b9c0d5"),
  "registrationId": ObjectId("94f1a2b3c4d5e6f7a8b9c0d4"),
  "verificationCode": "CERT-2026-XYZ123",
  "issueDate": ISODate("2026-03-15T11:00:00Z"),
  "pdfUrl": "/certificates/CERT-2026-XYZ123.pdf"
}

```

Explicação
\_id: corresponde ao id do Prisma (@id @default(auto()) @map("\_id") @db.ObjectId).

registrationId: referência ao documento da coleção registrations.

verificationCode: código único de verificação do certificado.

pdfUrl: caminho/URL do arquivo PDF armazenado.

issueDate: data/hora de emissão do certificado.

### Associação evento-palestrante via arrays

```
{
  "_id": ObjectId("64f1a2b3c4d5e6f7a8b9c0d1"),
  "speakerIds": [ObjectId("84f1a2b3c4d5e6f7a8b9c0d3")]
}
```

```
{
  "_id": ObjectId("84f1a2b3c4d5e6f7a8b9c0d3"),
  "eventIds": [ObjectId("64f1a2b3c4d5e6f7a8b9c0d1")]
}
```

✅ Relação com Registration
Cada Registration pode ter no máximo um Certificate.

No Prisma, isso é modelado com `@relation(fields: [registrationId], references: [id])`.

No MongoDB, você mantém a integridade usando o campo `registrationId` como referência.

👉 Assim, o ciclo fica completo:

Participant → faz uma inscrição (Registration) em um Event.

Essa inscrição pode gerar um Certificate, que referencia diretamente o `registrationId`.

## Considerações sobre relacionamentos

- Em MongoDB, referências por ID são comuns para manter integridade entre coleções.

Você pode usar população (populate) com Mongoose (se estiver usando Node.js) para buscar dados relacionados.

Para dados que não mudam com frequência (como palestrantes dentro de eventos), pode-se usar documentos embutidos.

✅ Vantagens do modelo NoSQL

Flexibilidade para adicionar novos campos sem alterar estrutura.

Escalabilidade horizontal.

Ideal para sistemas com leitura intensa e estrutura variável.

# 📋 Índice de Documentação - Sistema de Gerenciamento de Palestras

## 📌 Quick Links

**Status da Arquitetura**: ✅ **FINALIZADO E DOCUMENTADO**

---

## 📁 Arquivos de Referência

### 1. **Diagrama UML (Especificação Visual)**

📄 **Arquivo**: [`docs/UML-Gerenciamento-Palestras-Estrito.drawio`](../UML-Gerenciamento-Palestras-Estrito.drawio)

**Conteúdo**:

- 7 entidades (User, Speaker, Event, EventSession, Registration, Attendance, Certificate)
- Relacionamentos com cardinalidades corretas
- Todos os campos com tipos, constraints (PK, FK, unique, defaults)
- 3 enums (UserRole, RegistrationStatus, EventStatus)

**Como usar**:

1. Abrir em Draw.io ou Online: [draw.io](https://app.diagrams.net)
2. Importar arquivo `.drawio`
3. Consultar quando houver dúvida sobre relacionamentos ou campos
4. Exportar para PNG/PDF se precisar incluir em documentação

**Responsável**: Toda equipe (referência oficial)

---

### 2. **Schema Prisma (Especificação Técnica)**

📄 **Arquivo**: [`back-end/prisma/schema.prisma`](../back-end/prisma/schema.prisma)

**Conteúdo**:

- Definições de todos os modelos Prisma
- Enums tipados
- Relações (@relation)
- Constraints (@@unique, @@index)
- Comentários explicativos

**Como usar**:

```bash
# Visualizar dados em tempo real
npx prisma studio

# Gerar migration após mudanças
npx prisma migrate dev --name meu_nome_descritivo

# Regenerar Prisma Client
npx prisma generate
```

**Comandos essenciais**:

```bash
cd back-end

# Ver status das migrations
npx prisma migrate status

# Reset database (⚠️ Mongo: use o seed para limpar/recriar dados de dev)
npm run seed

# Ver schema em formato ASCII
npx prisma format
```

**Responsável**: Backend Team (implementação)

---

### 3. **Resumo Executivo da Arquitetura**

📄 **Arquivo**: [`docs/RESUMO-ARQUITETURA-FINAL.md`](./RESUMO-ARQUITETURA-FINAL.md)

**Seções**:

- Visão geral do sistema
- Entidades e responsabilidades detalhadas
- Enums tipados
- Fluxo de uso prático (passo-a-passo)
- Endpoints REST consolidados
- Decisões arquiteturais justificadas
- Índices para performance
- Validações e regras de negócio
- Segurança implementada
- Próximas etapas após aprovação
- Checklist de implementação

**Como usar**:

- Ler para entender a visão geral do projeto
- Referência para justificar decisões técnicas
- Compartilhar com stakeholders não-técnicos (partes relevantes)
- Validar contra requisitos de negócio

**Responsável**: PM, Arquiteto (validação com stakeholders)

---

### 4. **Mapeamento de Rotas e Controllers**

📄 **Arquivo**: [`docs/rotas-controllers-mapeamento.md`](./rotas-controllers-mapeamento.md)

**Conteúdo**:

- Endpoints REST por entidade (Users, Events, Speakers, etc.)
- Métodos HTTP, rotas, responsabilidades
- Fluxo de dados em exemplo prático
- Middleware e segurança
- Índices recomendados para MongoDB

**Tabela de referência rápida**:
| Entidade | Controller | Arquivo |
|----------|-----------|---------|
| Users | usersController.js | `/users` |
| Events | eventsController.js | `/events` |
| Speakers | speakersController.js | `/speakers` |
| Event-Speaker Association | eventsController.js / speakersController.js | `/events/:id` e `/speakers/:id` |
| Registrations | registrationsController.js | `/registrations` |
| Certificates | certificatesController.js | `/certificates` |

**Como usar**:

- Ir para este documento quando for implementar uma rota
- Colar endpoints na Postman/Insomnia
- Base para criar controllers

**Responsável**: Backend Team (implementação de rotas)

---

### 5. **Guia de Migração - Schema Antigo → Novo**

📄 **Arquivo**: [`docs/GUIA-MIGRACAO-SCHEMA.md`](./GUIA-MIGRACAO-SCHEMA.md)

**Conteúdo**:

- Resumo das mudanças (removido, adicionado, modificado)
- Mapeamento detalhe por detalhe (antes → depois)
- Motivos das mudanças
- Procedimento de migração passo-a-passo
- Script de seed de dados de teste
- Checklist de migração
- FAQ

**Principais mudanças**:

- ~~`Participant`~~ → `User` com `role: PARTICIPANT`
- **Novo**: `EventSession` (para multi-sessão)
- **Novo**: `Attendance` (para presença granular)
- Event: adicionado `status`, `certificateRequiredPercent`, `createdByAdminId`
- Registration: adicionado `attendancePercent`, `attendedSessionsCount`, `approvedForCertificate`
- RegistrationStatus: `PENDENTE` → `CONCLUIDO`
- Certificate: adicionado `attendancePercentAtIssue`, `issuedByAdminId`

**Como usar**:

1. Ler se você estava em projetos anteriores com schema antigo
2. Usar procedimento para migrar dados (se houver)
3. Rodar seed para test data
4. Atualizar controllers conforme necessário

**Responsável**: DBA/Backend para migração de dados

---

### 6. **Suite de Testes Completa**

📄 **Arquivo**: [`docs/SUITE-TESTES.md`](./SUITE-TESTES.md)

**Seções**:

- Testes unitários (Services)
- Testes de API REST (por endpoint)
- Testes de integração (fluxo end-to-end)
- Testes de validação (edge cases)
- Performance & load tests
- Configuração do ambiente
- Cobertura esperada
- Checklist antes de deploy

**Estrutura de testes**:

```
Unitários (Services)
├── AttendanceService (cálculo de %)
├── CertificateService (geração de cert)
└── RegistrationService (inscrição)

API REST (Controllers)
├── Autenticação
├── Eventos
├── Inscrições
├── Presença
└── Certificados

Integração
└── Fluxo completo: inscrição → presença → certificado

Validação
├── Edge cases (74.99%, 75%, 75.01%)
└── Cascade deletes
```

**Como usar**:

1. Copiar testes para `__tests__/` conforme implementa
2. Rodar `npm test` para validar código
3. Atingir >80% de cobertura antes de merge
4. Usar checklist antes de deploy

**Responsável**: QA Team (testes), Backend (implementação testável)

---

## 🎯 Fluxo de Trabalho Recomendado

### Fase 1: Setup Inicial (1-2 dias)

1. ✅ Ler **Resumo Arquitetura Final** (entendimento geral)
2. ✅ Consultar **UML Diagrama** (visual da estrutura)
3. ✅ Preparar ambiente MongoDB + Prisma

### Fase 2: Implementação Backend (2-3 semanas)

1. ✅ Copiar novo **schema.prisma** para o projeto
2. ✅ Executar `prisma migrate dev --name init` (criar migrations)
3. ✅ Rodar script de **seed** (dados de teste)
4. ✅ Implementar **Controllers** (usar mapeamento de rotas)
5. ✅ Implementar **Services** (lógica de negócio)
6. ✅ Escrever **testes** (conforme implementa)

### Fase 3: Validação (1 semana)

1. ✅ Rodar **Suite de Testes** completa
2. ✅ Testar endpoints com **Postman/Insomnia**
3. ✅ Validar **regra de 75%** (edge cases)
4. ✅ Verificar **constraints de unicidade**

### Fase 4: Frontend (Paralelo)

1. ✅ Ler endpoints do **mapeamento de rotas**
2. ✅ Criar telas conforme interfaces de API
3. ✅ Testar integração com backend

### Fase 5: Deploy (1-2 dias)

1. ✅ Checklist pré-deploy validado
2. ✅ Deploy em staging
3. ✅ Testes de smoke em produção
4. ✅ Monitoramento de erros

---

## 🔍 Procurando Por Uma Resposta Específica?

| Pergunta                                  | Arquivo                                        |
| ----------------------------------------- | ---------------------------------------------- |
| "Como é a estrutura de dados?"            | UML Diagrama ou Schema Prisma                  |
| "Qual é o fluxo de inscrição?"            | RESUMO-ARQUITETURA (seção Fluxo de Uso)        |
| "Qual é o endpoint para marcar presença?" | Mapeamento de Rotas                            |
| "Como implemento presença granular?"      | RESUMO-ARQUITETURA (seção Attendance)          |
| "Qual é a regra para certificado?"        | RESUMO-ARQUITETURA (75% de presença)           |
| "Como testo o sistema?"                   | SUITE-TESTES                                   |
| "Como migrar do schema antigo?"           | GUIA-MIGRACAO-SCHEMA                           |
| "Como executar Prisma Studio?"            | Schema Prisma ou RESUMO-ARQUITETURA            |
| "Quais são os enums?"                     | RESUMO-ARQUITETURA (seção Enums)               |
| "Como validar um certificado?"            | O fluxo público não está exposto neste backend |

---

## 👥 Responsabilidades por Role

### Product Manager 📊

- Ler: **RESUMO-ARQUITETURA**
- Comunicar com stakeholders
- Validar requisitos versus modelo entregue
- Aprovar antes de implementação

### Arquiteto/Lead Backend 🏗️

- Ler: Todo documento em detalhe
- Revisar schema.prisma com time
- Definir padrões de controladores/services
- Revisar PRs com foco em arquitetura

### Backend Developer 💻

- Ler: **Mapeamento de Rotas** + **Schema Prisma**
- Implementar controllers/services
- Escrever testes conforme avança
- Consultar RESUMO-ARQUITETURA para entender lógica

### QA/Tester 🧪

- Ler: **SUITE-TESTES** completa
- Executar testes antes de merge
- Validar edge cases
- Criar casos de teste adicionais (se necessário)

### Frontend Developer 🎨

- Ler: **Mapeamento de Rotas** (endpoints)
- Usar status codes e estruturas de resposta
- Consultar RESUMO-ARQUITETURA para entender fluxos
- Testar integração com backend

### DBA 🗄️

- Ler: **Schema Prisma** + **Guia Migração**
- Configurar MongoDB
- Gerenciar índices se necessário
- Resolver problemas de performance

---

## 🚀 Quick Start Commands

```bash
# Clonar projeto
git clone <repo>
cd back-end

# Setup Prisma
npx prisma migrate dev --name init
npm run seed

# Ver dados
npx prisma studio

# Rodar testes
npm test

# Iniciar servidor
npm start

# Validar schema
npx prisma validate
```

---

## 📞 Contato & Escalação

| Dúvida                                 | Consultar                                 |
| -------------------------------------- | ----------------------------------------- |
| "Qual é o relacionamento entre X e Y?" | UML Diagrama                              |
| "Como implemento X?"                   | Mapeamento de Rotas ou RESUMO-ARQUITETURA |
| "Schema.prisma está correto?"          | Arquiteto Backend                         |
| "Como testo X?"                        | SUITE-TESTES                              |
| "Qual é a regra de negócio para X?"    | RESUMO-ARQUITETURA (Validações)           |

---

## 📊 Métricas de Completude

| Artefato          | Status          | Descrição                          |
| ----------------- | --------------- | ---------------------------------- |
| UML Diagrama      | ✅ Completo     | 7 entidades, todos relacionamentos |
| Schema Prisma     | ✅ Completo     | Todos os modelos, enums, relações  |
| Rotas Mapeadas    | ✅ Completo     | 40+ endpoints definidos            |
| Testes Planejados | ✅ Completo     | 50+ casos de teste                 |
| Documentação      | ✅ Completo     | 5 documentos detalhados            |
| Controllers       | ❌ Não iniciado | Próximo passo                      |
| Services          | ❌ Não iniciado | Próximo passo                      |
| Frontend          | ❌ Não iniciado | Paralelo                           |

---

## 🎓 Versão Online

Se preferir visualizar em formato web:

- **Diagrama**: Importar `.drawio` em https://app.diagrams.net
- **Documentos**: GitHub Wiki ou Confluence
- **Swagger**: (a ser criado após implementar endpoints)

---

## 📝 Histórico de Versões

| Versão | Data     | Mudanças                |
| ------ | -------- | ----------------------- |
| 1.0    | Jan 2026 | Versão inicial completa |

---

## ✅ Checklist de Leitura (Novo Membro do Time)

Leia nesta ordem (2-3 horas):

- [ ] Este README (5 min)
- [ ] RESUMO-ARQUITETURA Final (45 min)
- [ ] UML Diagrama em Draw.io (30 min)
- [ ] Schema Prisma com comentários (20 min)
- [ ] Mapeamento de Rotas (20 min)
- [ ] Se migrar do antigo: GUIA-MIGRACAO (30 min)
- [ ] Se implementar: SUITE-TESTES (30 min)

---

## 🎯 Próximas Etapas

1. **Semana 1**: Setup projeto, validação com PM
2. **Semana 2-3**: Implementar controllers/services
3. **Semana 3**: Testes e validação
4. **Semana 4**: Frontend + integração
5. **Semana 5**: Deploy em staging

---

**Criado em**: Janeiro 2026  
**Última atualização**: Janeiro 2026  
**Mantido por**: Arquitetura Backend

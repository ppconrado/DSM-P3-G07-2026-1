# Migração e Execução — back-end

Passos rápidos para aplicar mudanças de schema, gerar o client e validar localmente.

1. Pare o servidor (nodemon) se estiver rodando. No Windows, processos em uso podem travar arquivos gerados pelo Prisma.

2. Atualize o `schema.prisma` (se ainda não estiver atualizado) e gere o Prisma Client:

```bash
cd back-end
npx prisma generate
```

3. (Opcional) Se houver alterações em enums/campos que causem divergência com dados antigos, considere rodar um script de migração manual ou limpar documentos inconsistentes.

4. Subir o servidor de desenvolvimento:

```bash
npm run dev
```

5. Popular dados de teste (seed):

```bash
npm run seed
```

6. Rodar smoke tests automáticos contra o servidor local:

```bash
npm run smoke
```

Observações importantes:

- No Windows, pare o processo que usa o Prisma Client antes de rodar `npx prisma generate` para evitar `EPERM` ao substituir arquivos.
- Os scripts `seed` e `smoke` são scripts utilitários de desenvolvimento; revise-os antes de executar em ambientes sensíveis.
- Depois de validar localmente, crie um branch e abra PR com as mudanças. Incluir no PR: instruções de migração acima, nota sobre parada do servidor em Windows, e passos para rodar seed/smoke.

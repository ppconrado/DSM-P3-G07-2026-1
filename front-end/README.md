# AcademyFlow Front-End

Front-end em Next.js para o sistema AcademyFlow, com foco em administração de eventos acadêmicos, inscrições, presença e certificados.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Radix UI para primitivas acessíveis

## Estrutura

- `app/`: rotas e layouts
- `components/`: componentes reutilizáveis
- `lib/`: utilitários, constantes e integração com API
- `public/`: assets estáticos, incluindo o logo do AcademyFlow

## Variáveis de ambiente

Crie um arquivo `.env.local` com:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8888
```

## Execução

```bash
npm install
npm run dev
```

## Observações de integração

- O login será feito no back-end via cookies `HttpOnly`.
- O front-end deve chamar a API com `credentials: 'include'`.
- O domínio de produção deve ser configurado para aceitar CORS com credenciais.

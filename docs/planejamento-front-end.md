Para criar o front-end em Next.js, precisamos basicamente de informações em 7 blocos: produto, usuários, dados, fluxo, visual, integrações e restrições técnicas.

O que ajuda mais:

1. Objetivo do sistema

Quais problemas o front-end precisa resolver
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Quais telas são prioritárias no MVP
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

O que entra na primeira versão e o que pode ficar para depois
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Perfis de usuário e permissões

Quais tipos de usuário existem: ADMIN e PARTICIPANTE
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

O que cada perfil pode ver e fazer
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Se haverá login, perfis administrativos e áreas restritas: SIM O PARTICIPANTE não pode acessar as telas do usuario ADMIN.
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Telas e funcionalidades

Lista de páginas desejadas
Fluxo de navegação entre elas
Funcionalidades de cada tela

Exemplos de ações importantes, como criar curso, inscrever participante, emitir certificado, acompanhar presença:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Dados e backend

Quais endpoints a API já oferece ou vai oferecer
Formato dos dados principais
Se já existe autenticação, token, sessão ou cookies
Se o front-end vai consumir uma API pronta ou se você quer que eu também desenhe a integração

Regras de negócio

Regras de matrícula, lotação, datas, presença e certificados:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

O que acontece quando um evento está lotado ou encerrado:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Regras de validação e mensagens de erro esperadas:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Campos obrigatórios e dependências entre campos:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

formulário base do front-end em Next.js:

1. Visão geral

Nome do sistema: AcademyFlow

Objetivo principal: Projeto de desenvolvimento de um sistema de gerenciamento de Eventos Acadêmicos, Cursos, Palestras, Workshops e Treinamentos.

Público-alvo: Faculdades, Escolas, Empresas de Treinamento, Empresas de Palestras, Empresas de Cursos.

2. Perfis de usuário

Tipos de usuário: ADMIN do aplicativo. PARTICIPANTE dos cursos e palestras. Professores, palestrantes, coaches e Intrutores (denominados no diagrama UML como speakers)

O que cada um pode fazer:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Existe login?: sim e diferente roles: PARTICIPANTE e ADMIN (Entidade USER com Enum)

Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

3. Telas necessárias

Páginas que devem existir no MVP: Ver

Páginas administrativas: SIM para o usuario ADMIN gerenciar os eventos, sessions, presenças, palestrantes, participantes, inscrições
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Páginas públicas:

Fluxo principal entre telas:

4. Funcionalidades

Cadastro de cursos/workshops/palestras:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Inscrição de participantes:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Controle de presença:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Emissão de certificados:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Relatórios/dashboards:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Busca/filtros:
Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

5. API e dados

A API já existe?: sim, C:\dev\ws-fatec\DSM-P3-G07-2026-1\back-end

Endpoints disponíveis: ver documento Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

Autenticação usada: Implementar JWT com access + refresh tokens, armazenados em cookie HttpOnly seguro (SameSite=strict) — recomendado para Next.js (protege contra XSS, permite renovação de sessão e integra bem com SSR).

Principais entidades: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

6. Regras de negócio

Regras de matrícula: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Regras de lotação: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Regras de presença: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Regras de certificado: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
Validações importantes: ver Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md

7. Visual

Estilo desejado: ver Guia de Estilo — AcademyFlow abaixo
Cores ou identidade visual: ver Guia de Estilo — AcademyFlow abaixo
Referências de sites/telas: ver Guia de Estilo — AcademyFlow abaixo
Tema claro/escuro/both: ver Guia de Estilo — AcademyFlow abaixo

🎨 Guia de Estilo — AcademyFlow

🧭 Logo:

Logo do aplicativo AcademyFlow: docs\logo-AcademyFlow.png (vai ser movido para a pasta public assets do front-end).
Esse logo já está pronto para ser usado no front‑end (login, dashboard, rodapé e splash screen).

Ícone circular com linhas fluidas em azul, verde e laranja.
Livro aberto no centro, simbolizando educação.
Tipografia moderna: Academy em azul e Flow em verde.

🧩 Paleta de Cores

Função Cor Hex
Primária Azul tecnológico #0078D7
Secundária Verde aprendizado #00B294
Destaque Laranja inovação #FF8C00
Fundo claro Branco gelo #F5F7FA
Texto principal Cinza escuro #333333

| Função          | Cor               | Hex       |
| --------------- | ----------------- | --------- |
| Primária        | Azul tecnológico  | `#0078D7` |
| Secundária      | Verde aprendizado | `#00B294` |
| Destaque        | Laranja inovação  | `#FF8C00` |
| Fundo claro     | Branco gelo       | `#F5F7FA` |
| Texto principal | Cinza escuro      | `#333333` |

Essas cores refletem confiança, crescimento e energia, mantendo o visual limpo e moderno.

🔠 Tipografia

Título e logotipo: Montserrat Bold

Subtítulos: Lato SemiBold

Texto de corpo: Open Sans Regular

Código ou dados técnicos: Roboto Mono

Dica: mantenha espaçamento generoso e contraste alto para legibilidade em dashboards e formulários.

🧱 Componentes principais

Botões: cantos levemente arredondados, sombra suave, animação hover com gradiente azul‑verde.

Cards: fundo branco com borda sutil, ícone do tipo de evento (curso, palestra, workshop).

Navbar: fixa no topo, com logotipo à esquerda e menu de navegação à direita.

Dashboard: layout em grade com widgets de calendário, eventos recentes e estatísticas.

💡 Elementos visuais

Ícones minimalistas (linha fina, estilo outline).

Ilustrações vetoriais com curvas fluidas, reforçando o conceito de “fluxo”.

Animações leves: fade‑in em cards, transições suaves entre seções.

🗣️ Slogan

“Conectando conhecimento e experiências”  
Mantém o foco na missão do projeto e pode ser usado no rodapé, tela de login ou splash screen.

🧭 Diretrizes de UX

Fluxo intuitivo: cadastro → criação de evento → inscrição → acompanhamento.

Feedback visual: mensagens de sucesso e erro com cores consistentes.

Responsividade: grid flexível para desktop, tablet e mobile.

8. Técnica

Next.js com TypeScript?: SIM

App Router ou Pages Router?:

Biblioteca de UI: SIM Tailwind e Radix UI

SEO, acessibilidade, responsividade, internacionalização: Sim (Mobile first)

Se quiser, você pode responder só com:

1. telas

🧭 Arquitetura das Telas do Front‑End

🏠 Página Inicial (Login/Logout)

Cabeçalho fixo com:

Logotipo AcademyFlow à esquerda.

Links à direita: Login, Logout, Dashboard, Ajuda.

Corpo principal:

Breve apresentação do sistema e botão “Entrar”.

Fundo com gradiente azul‑verde (cores da identidade visual).

Rodapé com o slogan: “Conectando conhecimento e experiências”.

Funcionalidade:

Autenticação via e‑mail e senha (hash armazenado conforme o documento).

Redirecionamento automático para o dashboard conforme o role.

👤 Dashboard do Participante

Menu lateral:

Eventos disponíveis

Minhas inscrições

Meus certificados

Perfil

Painel principal:

Cards de eventos com título, data, local e botão “Inscrever‑se”.

Filtros por tipo (palestra, workshop, minicurso).

Status da inscrição (ATIVO, CANCELADO, CONCLUÍDO).

Link para download do certificado quando disponível.

Integração com back‑end:

CRUD de Registration e Certificate conforme o modelo Prisma/MongoDB.

🛠️ Dashboard do Admin

Menu lateral ou no cabeçalho:

Gerenciar eventos

Gerenciar palestrantes

Validar presença

Emitir certificados

Relatórios

Painel principal:

Tabelas com listagem de eventos e palestrantes.

Botões para criar, editar e excluir (Event, Speaker).

Validação de presença e geração de certificados (Certificate).

Sincronização automática dos arrays speakerIds e eventIds.

💡 Fluxo de Navegação

Login → identifica role.

Se PARTICIPANTE → redireciona para /dashboard/participant.

Se ADMIN → redireciona para /dashboard/admin.

Logout → retorna à página inicial.

🎨 Estilo Visual

Paleta: Azul #0078D7, Verde #00B294, Laranja #FF8C00.

Tipografia: Montserrat (títulos), Lato (subtítulos), Open Sans (texto).

Ícones minimalistas e animações suaves para transições.

🏠 Tela Inicial (Login/Logout)

Objetivo: permitir autenticação e acesso ao sistema.

Estrutura

Cabeçalho fixo:

Logotipo AcademyFlow à esquerda.

Links à direita: Login, Logout, Dashboard, Ajuda.

Corpo:

Fundo com gradiente azul‑verde.

Card central com formulário de login:

Campos: email, senha.

Botão principal: Entrar (azul).

Link secundário: Criar conta (verde).

Rodapé com o slogan: “Conectando conhecimento e experiências”.

Comportamento
Após login, o sistema identifica o role e redireciona:

PARTICIPANTE → /dashboard/participant

ADMIN → /dashboard/admin

Logout retorna à página inicial.

👤 Dashboard do Participante
Objetivo: gerenciar inscrições e certificados.

Layout
Menu lateral:

Eventos disponíveis

Minhas inscrições

Meus certificados

Perfil

Painel principal:

Cards de eventos com título, data, local e botão Inscrever‑se.

Filtros por tipo (palestra, workshop, minicurso).

Status da inscrição (ATIVO, CANCELADO, CONCLUÍDO).

Link para download do certificado.

Integração
CRUD de Registration e Certificate conforme o documento.

Validação de presença e geração automática de certificados.

🛠️ Dashboard do Admin
Objetivo: gerenciar eventos, palestrantes e certificados.

Layout
Menu lateral:

Gerenciar eventos

Gerenciar palestrantes

Validar presença

Emitir certificados

Relatórios

Painel principal:

Tabelas com listagem de eventos e palestrantes.

Botões para criar, editar e excluir (Event, Speaker).

Sincronização automática dos arrays speakerIds e eventIds.

🎨 Estilo Visual
Elemento Diretriz
Cores Azul #0078D7, Verde #00B294, Laranja #FF8C00, Branco #F5F7FA, Cinza #333333
Fontes Montserrat (títulos), Lato (subtítulos), Open Sans (texto)
Ícones Minimalistas, estilo outline
Animações Transições suaves e hover com sombra leve

💡 Fluxo de Navegação
Login → identifica role.

Redireciona para dashboard correspondente.

Logout → retorna à tela inicial

Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md

2. perfis
   Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
3. API : C:\dev\ws-fatec\DSM-P3-G07-2026-1\back-end
   Referencias: docs\funcionamento_sistema.md, docs\postman_collection.json, docs\UML-Gerenciamento-Palestras-Estrito.drawio, docs\memorial_descritivo_noam_abnt.md, docs\rotas-controllers-mapeamento.md, docs\error-messages.md
4. estilo visual

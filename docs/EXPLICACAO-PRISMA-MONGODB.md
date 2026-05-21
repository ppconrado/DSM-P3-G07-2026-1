# Explicação das Implementações com Prisma ORM e MongoDB

## Objetivo

Este documento resume a decisão técnica adotada no back-end do projeto para atender ao modelo definido no memorial e no UML, mantendo o uso do Prisma ORM como camada principal de acesso ao banco, mas recorrendo ao MongoDB bruto apenas nos pontos em que o ORM não atendia totalmente à regra de negócio.

## O que foi feito com Prisma ORM

O Prisma ORM foi usado nas operações padrão do sistema:

- criação, leitura, atualização e exclusão de usuários, eventos, palestrantes, inscrições, sessões, presenças e certificados;
- consultas por ID e listagens gerais;
- validações de existência, relacionamento e integridade;
- contagens para capacidade de evento, número de sessões e apuração de presença;
- atualização de documentos simples e compostos.

No modelo atual, "participante" é um papel de `User` controlado pelo enum `UserRole`, e não uma entidade separada.

Essas partes seguem o uso esperado do Prisma e mantêm o acesso ao MongoDB encapsulado pelo ORM sempre que possível.

## Onde foi necessário usar comandos nativos do MongoDB

A associação entre `Event` e `Speaker` foi mantida como o professor solicitou, usando arrays:

- `Event.speakerIds`
- `Speaker.eventIds`

Para essa associação, foi necessário usar comandos nativos do MongoDB em pontos específicos da sincronização, porque o Prisma ORM não oferece o mesmo nível de controle atômico para atualizar arrays com as mesmas garantias do MongoDB puro.

Os comandos usados foram, principalmente:

- `$addToSet` para adicionar um ID sem duplicar;
- `$pull` para remover um ID específico do array.

## Por que isso foi necessário

A atualização dos arrays precisa ser:

- atômica;
- consistente nos dois sentidos da relação;
- livre de duplicação;
- segura contra concorrência entre requisições.

Se a atualização fosse feita apenas com leitura e regravação do array pelo Prisma, haveria risco de:

- duplicar IDs;
- perder atualizações concorrentes;
- deixar `Event.speakerIds` e `Speaker.eventIds` inconsistentes.

Por isso, a implementação usa MongoDB bruto apenas nessa sincronização específica.

## O que foi normalizado nas respostas

Como o MongoDB pode retornar dados em formato Extended JSON, a API foi ajustada para responder em JSON simples para o front-end e para o Postman.

Isso inclui a conversão de:

- `{"$oid": "..."}` para string simples;
- `{"$date": "..."}` para data em ISO string.

Assim, o consumo da API fica mais limpo e previsível.

## Resumo técnico para explicação ao professor

A estratégia adotada foi:

1. usar Prisma ORM em todo o CRUD e nas consultas normais;
2. manter a associação `Event` ↔ `Speaker` como arrays, conforme o modelo definido;
3. usar comandos nativos do MongoDB somente para sincronização atômica dos arrays;
4. normalizar a saída da API para evitar que o MongoDB exponha `cursor`, `firstBatch`, `$oid` e `$date` nas respostas.

## Conclusão

A implementação respeita o modelo conceitual do projeto e usa o Prisma ORM como base principal. O uso do MongoDB bruto foi uma exceção técnica localizada, necessária para garantir integridade e atomicidade na associação por arrays entre evento e palestrante.

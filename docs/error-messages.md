# Mensagens de Erro Padronizadas

Este documento lista todas as mensagens de erro que a API retorna, padronizadas em português para uso em **toast messages** no front-end.

## Formato de Resposta de Erro

Todas as respostas de erro seguem este padrão:

```json
{
  "error": "Descrição do erro em português"
}
```

---

## Usuários

| Status | Mensagem                         | Cenário                                                |
| ------ | -------------------------------- | ------------------------------------------------------ |
| 409    | E-mail já cadastrado.            | Tentar criar ou atualizar usuário com e-mail duplicado |
| 400    | Senha inválida.                  | Senha vazia ou formato inválido                        |
| 400    | Função de usuário inválida.      | Role não é ADMIN ou PARTICIPANTE                       |
| 400    | ID inválido em createdByAdminId. | ObjectId malformado                                    |
| 404    | Usuário não encontrado.          | ID do usuário não existe                               |
| 409    | Usuário já está inativo.         | Tentar desativar usuário já inativo                    |
| 500    | Erro ao buscar usuários.         | Erro interno do servidor                               |
| 500    | Erro ao buscar usuário.          | Erro interno do servidor                               |
| 500    | Erro ao desativar usuário.       | Erro interno do servidor                               |

---

## Eventos

| Status | Mensagem                                                    | Cenário                                                |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------ |
| 403    | Apenas ADMIN pode criar eventos.                            | Usuário não-ADMIN tenta criar evento                   |
| 400    | ID inválido em createdByAdminId.                            | ObjectId malformado                                    |
| 400    | Data inválida em startDate.                                 | startDate não é data válida                            |
| 400    | Data inválida em endDate.                                   | endDate não é data válida                              |
| 400    | Não é possível publicar evento sem ao menos uma sessão.     | Tentar publicar evento (status ATIVA) sem sessões      |
| 400    | Não é possível publicar evento sem ao menos um palestrante. | Tentar publicar evento (status ATIVA) sem palestrantes |
| 404    | Evento não encontrado.                                      | ID do evento não existe                                |
| 500    | Erro ao buscar eventos.                                     | Erro interno do servidor                               |
| 500    | Erro ao buscar evento.                                      | Erro interno do servidor                               |
| 500    | Erro ao deletar evento.                                     | Erro interno do servidor                               |

---

## Palestrantes

| Status | Mensagem                     | Cenário                                                    |
| ------ | ---------------------------- | ---------------------------------------------------------- |
| 400    | ID inválido em speakerId.    | ID de palestrante malformado                               |
| 409    | E-mail já cadastrado.        | Tentar criar ou atualizar palestrante com e-mail duplicado |
| 404    | Palestrante não encontrado.  | ID do palestrante não existe                               |
| 500    | Erro ao buscar palestrantes. | Erro interno do servidor                                   |
| 500    | Erro ao buscar palestrante.  | Erro interno do servidor                                   |
| 500    | Erro ao deletar palestrante. | Erro interno do servidor                                   |

---

## Inscrições (Registrations)

| Status | Mensagem                                                              | Cenário                                                      |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| 409    | Inscrição duplicada: este participante já está inscrito neste evento. | Tentar inscrever participante que já está inscrito no evento |
| 404    | Evento não encontrado.                                                | ID do evento não existe                                      |
| 400    | Inscrição só permitida em eventos com status ATIVA.                   | Tentar inscrever em evento com status diferente de ATIVA     |
| 400    | Capacidade do evento atingida.                                        | Número de inscrições atingiu o limite                        |
| 404    | Inscrição não encontrada.                                             | ID da inscrição não existe                                   |
| 500    | Erro ao buscar inscrições.                                            | Erro interno do servidor                                     |
| 500    | Erro ao buscar inscrição.                                             | Erro interno do servidor                                     |
| 500    | Erro ao deletar inscrição.                                            | Erro interno do servidor                                     |

---

## Sessões de Evento

| Status | Mensagem                                     | Cenário                                                  |
| ------ | -------------------------------------------- | -------------------------------------------------------- |
| 404    | Evento não encontrado.                       | ID do evento não existe                                  |
| 400    | Data inválida em sessionDate.                | sessionDate não é data válida                            |
| 400    | Sessão fora do intervalo de datas do evento. | sessionDate não está entre startDate e endDate do evento |
| 404    | Sessão não encontrada.                       | ID da sessão não existe                                  |
| 500    | Erro ao buscar sessões.                      | Erro interno do servidor                                 |
| 500    | Erro ao buscar sessão.                       | Erro interno do servidor                                 |
| 500    | Erro ao deletar sessão.                      | Erro interno do servidor                                 |
| 500    | Erro ao buscar presenças da sessão.          | Erro interno do servidor                                 |

---

## Presença (Attendance)

| Status | Mensagem                                    | Cenário                                    |
| ------ | ------------------------------------------- | ------------------------------------------ |
| 404    | Inscrição não encontrada.                   | ID da inscrição não existe                 |
| 404    | Sessão não encontrada.                      | ID da sessão não existe                    |
| 400    | ID inválido em eventSessionId.              | ObjectId malformado                        |
| 400    | Sessão não pertence ao evento da inscrição. | A sessão pertence a outro evento           |
| 403    | Apenas ADMIN pode marcar presença.          | Usuário não-ADMIN tenta criar presença     |
| 404    | Presença não encontrada.                    | ID da presença não existe                  |
| 403    | Apenas ADMIN pode atualizar presença.       | Usuário não-ADMIN tenta atualizar presença |
| 403    | Apenas ADMIN pode remover presença.         | Usuário não-ADMIN tenta deletar presença   |
| 500    | Erro ao buscar presenças.                   | Erro interno do servidor                   |
| 500    | Erro ao buscar presença.                    | Erro interno do servidor                   |
| 500    | Erro ao deletar presença.                   | Erro interno do servidor                   |

---

## Certificados

| Status | Mensagem                                                     | Cenário                                                                 |
| ------ | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 400    | Nenhum arquivo enviado.                                      | Upload de PDF sem arquivo                                               |
| 500    | Erro ao fazer upload do PDF.                                 | Erro interno durante upload                                             |
| 404    | Inscrição não encontrada.                                    | ID da inscrição não existe                                              |
| 400    | Já existe certificado para esta inscrição.                   | Tentar criar segundo certificado para mesma inscrição                   |
| 400    | URL do PDF é obrigatória.                                    | Campo pdfUrl faltando na requisição                                     |
| 400    | ID do administrador é obrigatório.                           | Campo issuedByAdminId faltando na requisição                            |
| 403    | Apenas ADMIN pode emitir certificados.                       | Usuário não-ADMIN tenta criar certificado                               |
| 400    | Inscrição não atingiu o percentual mínimo de presença (75%). | Participante não tem presença suficiente (mensagem dinâmica com % real) |
| 404    | Certificado não encontrado.                                  | ID do certificado não existe                                            |
| 500    | Erro ao buscar certificado.                                  | Erro interno do servidor                                                |
| 500    | Erro ao buscar certificados.                                 | Erro interno do servidor                                                |
| 500    | Erro ao deletar certificado.                                 | Erro interno do servidor                                                |

---

## Padrões de Mensagem

### Autenticação/Autorização

- `403 Apenas ADMIN pode...` → Usuário não tem permissão para esta ação
- `400 Função de usuário inválida.` → Role fornecida não é válida

### Validação de Dados

- `400 {Campo} inválido.` → Campo tem formato inválido
- `400 {Campo} é obrigatório.` → Campo não foi fornecido
- `400 Data inválida em {campo}.` → Data malformada ou fora de intervalo

### Duplicação/Conflito

- `409 {Entidade} já cadastrado.` → Entidade única duplicada
- `409 {Entidade} duplicada: ...` → Combinação única violada

### Não Encontrado

- `404 {Entidade} não encontrada.` → ID não existe

### Erro Genérico

- `500 Erro ao {ação} {entidade}.` → Erro interno do servidor
- `400 Erro ao {ação} {entidade}.` → Erro genérico validação/negócio

---

## Dicas para Frontend

1. **Toast Duration**: 3-4 segundos para mensagens de sucesso, 5-6 para erros
2. **Toast Position**: Top-right ou top-center
3. **Toast Type**: Mapear HTTP status para tipo de toast
   - 4xx → warning/error
   - 5xx → error
   - 201, 200 → success
4. **Mensagens em Português**: Todas as mensagens já vêm em português da API, não fazer tradução no front
5. **JSON.parse(error.response?.data?.error)**: Sempre acessar `error.response.data.error` para pegar a mensagem

---

## Exemplo de Uso

```javascript
// No front-end (ex: React/Vue)
try {
  const response = await api.post('/users', userData);
  showToast('Usuário criado com sucesso!', 'success');
} catch (error) {
  const mensagem = error.response?.data?.error || 'Erro desconhecido';
  showToast(mensagem, 'error'); // Mostra mensagem em português direto da API
}
```

# AI Layer — contribuição individual, Fase 7

Responsável: **Erick Gruber — RM 99584**. Entrega prevista: **18/11/2026**.

A AI Layer consulta evidências no DB Layer e devolve `PROPOSE` ou `DEFER` ao
Backend Core. A análise de conflitos permanece **determinística**. Ela não
executa SQL, não altera bancos e não realiza migração. O chat com Gemini/OpenAI
é opcional e fica fora do fluxo principal do Core.

Esta contribuição parte do código efetivamente entregue na Fase 6, conferido
com o GitHub, e modifica **somente este microserviço**.

## Executar e verificar

Requisito: Node.js 22 ou 24 e npm. Nenhuma chave de IA é necessária para a suíte.

```bash
npm ci
npm run check
npm test
npm run test:coverage
npm start
```

O serviço usa a porta 3001 e consulta o DB Layer em `http://localhost:3002`.
Copie `.env.example` para `.env` se precisar alterar essas configurações.
`npm run dev` continua disponível como alias do comando de inicialização.

Em outro terminal, com a AI Layer e o **DB Layer real já configurados pelo grupo**:

```bash
npm run smoke
```

O smoke espera o banco de demonstração da entrega: e-mail com excesso de tamanho e
`ativo` com valores 0, 1 e 2. Ele consulta dados e não executa migração.
A execução automática desse script na suíte usa um DB HTTP de teste, não bancos reais.

## Endpoints preservados

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/health` | Retorna `{"status":"ok"}`; confirma apenas que o processo atende |
| POST | `/ai/analyze-conflict` | Evidências do DB Layer; resposta no contrato já consumido pelo Core |
| POST | `/ai/chat` | Chat opcional; requer provider, modelo e chave configurados |

Exemplo de análise:

```json
{
  "conflictId": "clientes.email",
  "table": "clientes",
  "column": "email",
  "source": { "database": "mysql", "type": "VARCHAR(300)" },
  "target": { "database": "oracle", "type": "VARCHAR2(200)" }
}
```

O resultado mantém `conflictId, verdict, proposal, reason, simulated, toolsUsed, evidence`.
A proposta conhecida continua `VARCHAR2(300 CHAR)`, com `requiresValidation: true`.
Ausência de regra segura implica `DEFER`; falha técnica do DB gera HTTP 502/504,
sem fabricar evidências.

## Configuração

| Variável | Padrão / uso |
|---|---|
| `PORT` | 3001 |
| `DB_LAYER_URL` | `http://localhost:3002`; lida após o carregamento do `.env` |
| `DB_LAYER_TIMEOUT_MS` | 1000 ms por consulta; inteiro de 1 a 60000 |
| `AI_PROVIDER` | `gemini`; aceita também `openai` |
| `AI_FALLBACK_PROVIDER` | Vazio; opcional |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Somente para Gemini |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Somente para OpenAI |
| `AI_TIMEOUT_MS` | 15000 ms por requisição de SDK; não é limite global de uma conversa |
| `AI_LAYER_URL` | Somente no smoke; padrão `http://localhost:3001` |

O fluxo de e-mail faz duas consultas sequenciais ao DB. O padrão de 1000 ms por consulta
deixa margem para o timeout de 3000 ms por tentativa do Core entregue. Se o ambiente
precisar de outro tempo, o grupo deve compatibilizar ambos. A AI Layer não adiciona
retries de DB; o Core já possui retries. O chat pode fazer várias requisições e fallback.

## Docker

O Dockerfile original foi preservado, com Node 22, usuário `node`, porta 3001 e
`DB_LAYER_URL=http://db-layer:3002`.

```bash
docker build -t placeholder-ai-layer:fase7 .
docker run --rm -p 3001:3001 -e DB_LAYER_URL=http://host.docker.internal:3002 placeholder-ai-layer:fase7
```

Use o endereço de rede apropriado no Linux. A integração da plataforma continua a cargo
do grupo; nenhum Compose de outro serviço foi modificado.

## Evidências e limites

- **106 testes aprovados** em Node 24.17.0 e Node 22.23.5 no Windows.
- Instalação limpa e verificação sintática aprovadas.
- Auditoria npm em 17/11/2026: **zero vulnerabilidades conhecidas** após correção de
  `body-parser` e `qs`. Isso não comprova ausência de vulnerabilidades desconhecidas.
- DB e providers são substituídos por fixtures/dublês nos testes.
- Não foram executados o fluxo coletivo ponta a ponta, Oracle/MySQL reais, chamadas
  de LLM com credenciais reais ou build Docker. O daemon Docker não estava ativo.
- CI preparada para Node 22/24 e build Docker; ainda não executada no GitHub.
- O enunciado integral da Fase 7 não estava no material consultado. Esta entrega
  cobre o escopo individual solicitado, não certifica a conclusão acadêmica do grupo.

Documentos: [handoff](docs/HANDOFF.md), [contrato](docs/CONTRATO.md),
[relatório de testes](docs/RELATORIO_TESTES.md), [baseline](docs/BASELINE.md).

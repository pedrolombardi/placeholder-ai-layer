# AI Layer

Autor: Erick Gruber. Integração com os demais serviços: Pedro Lombardi.

## 1. Solução

A **AI Layer** é o microserviço que apoia a análise dos conflitos de migração. Ela reúne
evidências, apoia recomendações e indica quando uma decisão exige avaliação humana.

**Princípio:** a IA propõe e explica; a aplicação executa verificações controladas; alterações
críticas dependem de validação técnica e aprovação humana. A AI Layer nunca acessa um banco
diretamente nem gera SQL: ela pede **qual** evidência quer às tools do DB Layer, e o DB Layer
decide **como** consultar.

## 2. Tecnologias

- **Linguagem e runtime:** JavaScript (ESM), Node.js e Express 5.
- **Comunicação:** HTTP/REST com JSON.
- **Providers de IA:** Google Gemini (com tool calling) e OpenAI (somente texto), usados apenas no `/ai/chat`.
- **Integrações:** DB Layer (tools de evidência) e Backend Core (que chama a análise de conflito).

## 3. Endpoints

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | serviço ativo |
| POST | `/ai/analyze-conflict` | analisa um conflito de julgamento e responde **PROPOSE** (com proposta e evidência) ou **DEFER** (decisão humana). É o endpoint usado pelo Backend Core no fluxo da plataforma |
| POST | `/ai/chat` | conversa livre com o provider configurado, com tool calling (Gemini). Exige chave de API; fora do fluxo principal |

`/ai/analyze-conflict` recebe `{ conflictId, table, column, source: { database, type }, target: { database, type } }`
e devolve `{ conflictId, verdict, proposal, reason, simulated, toolsUsed, evidence }`.

## 4. Tools de evidência (dado real, via DB Layer)

| Tool | Endpoint do DB Layer | Exemplo real (banco de demonstração) |
|---|---|---|
| `profileColumn` | `POST /tools/profile-column` | `clientes.email`: 10 linhas, 2 acima de 200 bytes, máximo 226 |
| `sampleValues` | `POST /tools/sample-values` | `clientes.ativo`: `[0, 1, 2]`. Colunas com muitos valores distintos (CPF, e-mail) voltam mascaradas, por LGPD |
| `checkCharset` | `POST /tools/check-charset` | `utf8mb4`, `utf8mb4_0900_ai_ci`, 4 bytes por caractere |

As tools ficam em `src/tools/migrationTools.js` e chamam o DB Layer em `DB_LAYER_URL` (padrão
`http://localhost:3002`). Um erro 400 do DB Layer, como um identificador inválido, volta como
resultado da tool (`status: "INVALID"`), não como erro 500. Toda resposta traz
`simulated: false`.

## 5. Decisões PROPOSE e DEFER

As decisões do `/ai/analyze-conflict` saem de **regras determinísticas em JavaScript**
(`src/services/conflictAnalysisService.js`) sobre a evidência real. Elas não são julgamento
autônomo de um modelo:

- **PROPOSE — `clientes.email`** (`VARCHAR(300)` → `VARCHAR2(200)`): a evidência mostra valores
  acima de 200; a proposta é `VARCHAR2(300 CHAR)`, sujeita à validação no sandbox e à
  homologação humana.
- **DEFER — `clientes.ativo`:** a coluna tem os valores 0, 1 e 2. Sem a regra de negócio, não é
  seguro tratá-la como booleana.
- **DEFER sem evidência:** demais conflitos (por exemplo, `ON UPDATE CURRENT_TIMESTAMP` e
  `JSON → CLOB`) vão para decisão humana.

As regras estão calibradas para os conflitos do banco de demonstração. Generalizá-las é o
primeiro item dos próximos passos.

## 6. Como executar

**Na plataforma completa** (recomendado): repositório `placeholder-platform`, com
`docker compose up --build`. A AI Layer sobe já ligada ao DB Layer.

**Sozinha** (precisa do DB Layer rodando na porta 3002):

```powershell
npm install
npm run dev                      # porta 3001; DB_LAYER_URL padrão http://localhost:3002
Invoke-RestMethod http://localhost:3001/health
```

**Com Docker:**

```bash
docker build -t placeholder-ai-layer .
docker run -p 3001:3001 -e DB_LAYER_URL=http://host.docker.internal:3002 placeholder-ai-layer
```

**`/ai/chat` (opcional):** copie `.env.example` para `.env` e preencha o provider, a chave e o
modelo. Nunca versione o `.env`.

## 7. Testes

Este repositório **não tem testes automatizados**. O comportamento é verificado pelo teste ponta
a ponta da plataforma (`placeholder-platform/scripts/e2e.mjs`, que roda no CI): ele exige
PROPOSE em `clientes.email`, com evidência real, e DEFER em `clientes.ativo`.

## 8. Próximos passos (Fase 7)

1. Escolher as tools e as regras pelo campo `rules` do diff do DB Layer, e não pelo nome da coluna.
2. Usar o modelo (Gemini/OpenAI) na análise com saída estruturada, mantendo a validação
   determinística no DB Layer.
3. Remover as tools de demonstração `getSystemStatus` e `getCustomerData`, que devolvem dados fixos.
4. Testes automatizados (regras de PROPOSE/DEFER e cliente das tools) e CI.

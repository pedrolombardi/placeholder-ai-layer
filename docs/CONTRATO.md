# Contrato de integração preservado

## Backend Core → AI Layer

`POST /ai/analyze-conflict`, `Content-Type: application/json`.

```json
{
  "conflictId": "clientes.email",
  "table": "clientes",
  "column": "email",
  "source": { "database": "mysql", "type": "VARCHAR(300)" },
  "target": { "database": "oracle", "type": "VARCHAR2(200)" }
}
```

O Core entregue constrói exatamente esses campos. Campos adicionais não são exigidos
nem enviados ao DB. A AI Layer valida strings não vazias: ID até 256 caracteres,
tabela/coluna até 128, engine até 64 e tipo até 512.

Resposta HTTP 200:

```json
{
  "conflictId": "clientes.email",
  "verdict": "PROPOSE",
  "proposal": { "targetType": "VARCHAR2(300 CHAR)", "requiresValidation": true },
  "reason": "Explicação baseada na evidência",
  "simulated": false,
  "toolsUsed": ["profileColumn", "checkCharset"],
  "evidence": { "profileColumn": {}, "checkCharset": {} }
}
```

As evidências vazias acima ilustram apenas o envelope; na resposta real cada tool
contém seus campos retornados pelo DB. `DEFER` usa `proposal: null`.

O campo `simulated` agrega a procedência das evidências recebidas. Em uma resposta
sem evidências, o valor permanece `false` por compatibilidade; isso **não comprova
conexão nem validação em banco**. Consulte `evidence` e `toolsUsed`.

## AI Layer → DB Layer

| Tool | Método e rota | Corpo |
|---|---|---|
| `profileColumn` | POST `/tools/profile-column` | `{database, table, column}` |
| `sampleValues` | POST `/tools/sample-values` | `{database, table, column}` |
| `checkCharset` | POST `/tools/check-charset` | `{database, table, column}` |

Nenhum SQL, chave de LLM, senha de conexão ou corpo completo do conflito é enviado.
O DB Layer mantém a validação de identificadores e catálogo. As respostas
`OK`/`NO_DATA` precisam identificar banco, tabela, coluna e `simulated`.
Os campos relevantes de cada evidência são validados; formatos inconsistentes geram 502.

- HTTP 400 do DB: preserva `status: "INVALID"` como resultado de tool; a análise
  pode devolver `DEFER`. A mensagem bruta do DB não é retransmitida.
- `NO_DATA`: preservado como ausência de evidência.
- Rede/5xx/redirecionamento: HTTP 502, sem decisão fabricada.
- Timeout: HTTP 504, inclusive quando o corpo não termina.
- A URL configurada não aceita usuário/senha embutidos, query ou fragmento.
- Timeout padrão: 1000 ms por chamada; sem retries nesta camada.

## Erros HTTP públicos

| Status | Situação |
|---|---|
| 400 | JSON malformado, mensagem inválida ou conflito incompleto |
| 404 | Rota inexistente |
| 413 | Corpo maior que 100 KB |
| 415 | Codificação não suportada |
| 500 | Falha interna inesperada, com mensagem genérica |
| 502 | DB/provider indisponível, resposta inválida ou limite de tools |
| 503 | Configuração inválida ou provider sem credenciais/modelo |
| 504 | Timeout do DB Layer |

O corpo usa `{error}`, com `code` adicional nos erros de dependência/configuração.
O Core já trata 5xx como falhas de serviço; a estrutura de sucesso não mudou.

## Chat opcional

`POST /ai/chat` recebe `{"message":"texto"}`: texto não vazio, até 10000 caracteres.
Retorna `{response, provider}`; inclui `fallback:true` quando utilizou o alternativo.
Gemini oferece apenas as três tools de evidência; OpenAI permanece somente texto.
As chamadas a SDKs foram testadas com dublês, sem validar modelos/chaves reais.

Não há autenticação nem rate limiting na AI Layer. Mantenha o microserviço na rede
interna do MVP, com entrada controlada pelo ambiente do grupo. O chat pode enviar
a mensagem e resultados de tools ao provider escolhido; não inclua credenciais
ou dados pessoais no prompt. Mascaramento de dados consultados é responsabilidade
do DB Layer existente.

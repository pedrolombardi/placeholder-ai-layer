# AI Layer — Planejamento e estado atual do MVP

> **Escopo:** contribuição individual de Inteligência Artificial para a plataforma de migração de bancos de dados. Os cenários de análise abaixo utilizam **dados simulados**.

## 1. Solução

A **AI Layer** é um microserviço de apoio à análise de conflitos em migrações de bancos de dados. Seu objetivo é reunir evidências, apoiar recomendações e indicar quando uma decisão exige avaliação humana.

**Princípio:** a IA propõe e explica; a aplicação executa verificações controladas; alterações críticas dependem de validação técnica e aprovação humana. A AI Layer não realiza modificações diretas em bancos de produção.

## 2. Tecnologias utilizadas

- **Linguagem:** JavaScript.
- **Runtime e framework:** Node.js e Express.
- **Comunicação:** API HTTP/REST com JSON.
- **Providers de IA:** Google Gemini e OpenAI.
- **Integrações internas:** Provider Factory, System Prompt e Tool Calling.

## 3. Arquitetura e endpoints

A aplicação possui dois fluxos distintos:

```text
POST /ai/chat
  → AI Service → Provider Factory → Gemini (com Tool Calling) ou OpenAI (respostas textuais)

POST /ai/analyze-conflict
  → Conflict Analysis Service → Tools → Regras JavaScript → JSON
```

- `GET /health`: verifica se o servidor está ativo.
- `POST /ai/chat`: conversa com o provider configurado, com suporte a Tools.
- `POST /ai/analyze-conflict`: recebe os dados de um conflito de migração e retorna uma análise estruturada.

**Estado atual:** o endpoint de conflitos usa regras JavaScript e evidências simuladas; **não chama Gemini/OpenAI** para decidir entre `PROPOSE` e `DEFER`.

## 4. Produto Oracle

O produto Oracle previsto para a solução é o **Oracle Database**, utilizado como referência para o banco de destino nos cenários de migração.

A AI Layer já possui exemplos de conversão **MySQL → Oracle**, mas **não está conectada a uma instância Oracle real**. A futura integração deverá ocorrer por serviços e Tools controlados em conjunto com o backend do grupo.

## 5. Providers de IA

A infraestrutura já possui integração de código com **Gemini** e **OpenAI**, seleção configurável de provider e tentativa de **fallback** quando o principal falha.

Exemplo de configuração (sem chaves secretas):

```env
AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=openai
```

O Gemini já foi testado com sucesso executando a Tool `profileColumn` pelo endpoint `/ai/chat`. **No código atual, apenas o adaptador do Gemini implementa Tool Calling; o adaptador da OpenAI gera respostas textuais, sem executar Tools.** O fallback troca de provider, mas não reproduz automaticamente as mesmas ferramentas. Testes adicionais com os providers ficaram limitados pela quota do Gemini e pela ausência de créditos na API da OpenAI.

## 6. Tools de migração

As três ferramentas abaixo foram **implementadas e testadas localmente**, com dados de demonstração:

| Tool | Função | Exemplo simulado |
|---|---|---|
| `profileColumn` | Retorna estatísticas de uma coluna | 6.812 registros; 340 acima de 200 caracteres; máximo de 268 |
| `sampleValues` | Retorna valores de amostra | `clientes.ativo`: `[0, 1, 2]` |
| `checkCharset` | Retorna informações de codificação | `utf8mb4`, collation e bytes por caractere |

As Tools de infraestrutura `getSystemStatus` e `getCustomerData` também permanecem disponíveis para demonstração.

As três Tools de migração estão cadastradas em `toolDefinitions.js` e `toolExecutor.js`. O campo `simulated: true` identifica os resultados fictícios. Ainda falta substituir essas respostas por dados fornecidos pelos serviços reais do projeto.

## 7. Funcionalidades já implementadas

- Microserviço Express, endpoints `/health`, `/ai/chat` e `/ai/analyze-conflict`.
- Configuração de providers, fallback e mecanismo de Tool Calling.
- Execução e validação de parâmetros das três Tools de migração.
- Seleção das Tools conforme o cenário analisado.
- Resposta JSON com `conflictId`, `verdict`, `proposal`, `reason`, `simulated`, `toolsUsed` e `evidence`.
- Validação de campos obrigatórios e tipos de entrada; tratamento de erros HTTP `400` e `500`.

## 8. Decisões PROPOSE e DEFER

As decisões abaixo **já funcionam no MVP demonstrativo**, por **regras determinísticas em JavaScript**, e não por julgamento autônomo do modelo de IA.

**PROPOSE — `C-014`, coluna `clientes.email`:** a origem usa `VARCHAR(300)` e o destino proposto usa `VARCHAR2(200)`. As evidências simuladas indicam 340 valores acima de 200 caracteres. O serviço sugere **avaliar `VARCHAR2(300 CHAR)`**, com `requiresValidation: true`. A recomendação depende de verificação no Oracle e aprovação humana.

**DEFER — `C-015`, coluna `clientes.ativo`:** a Tool encontra os valores `[0, 1, 2]`. Sem saber o significado de `2`, o serviço não assume um campo booleano e solicita análise humana.

**DEFER sem evidências — `C-018`:** para uma tabela sem dados disponíveis nas Tools, nenhuma proposta é produzida.

## 9. Testes, segurança e execução local

### Como instalar e executar o microserviço

**Pré-requisito:** Node.js com npm instalado no computador. Extraia o ZIP e abra um terminal na pasta onde está o `package.json`.

```powershell
npm install
npm run dev
```

O servidor deverá iniciar na porta **3001** (ou na porta definida pela variável `PORT`). Em outro terminal PowerShell, verifique:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
```

**Resultado esperado:** `status: ok`.

Para testar o fluxo demonstrativo de conflito `PROPOSE`, sem precisar de chaves de API:

```powershell
$uri = "http://localhost:3001/ai/analyze-conflict"

$dados = @{
    conflictId = "C-014"
    table = "clientes"
    column = "email"
    source = @{ database = "mysql"; type = "VARCHAR(300)" }
    target = @{ database = "oracle"; type = "VARCHAR2(200)" }
}

$r = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Body ($dados | ConvertTo-Json -Depth 5)
$r | Select-Object conflictId, verdict, proposal, reason
```

**Resultado esperado:** `PROPOSE`, com sugestão `VARCHAR2(300 CHAR)` sujeita a validação humana.

Para testar `DEFER`, no mesmo terminal, altere somente os dados do conflito e execute a requisição novamente:

```powershell
$dados.conflictId = "C-015"
$dados.column = "ativo"
$dados.source.type = "TINYINT(1)"
$dados.target.type = "NUMBER(1)"

$r = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Body ($dados | ConvertTo-Json -Depth 5)
$r | Select-Object conflictId, verdict, reason
```

**Resultado esperado:** `DEFER`, pois os valores simulados `[0, 1, 2]` exigem validação humana antes de considerar a coluna booleana.

**Configuração opcional para `POST /ai/chat`:** esse endpoint utiliza de fato Gemini/OpenAI e exige credenciais válidas e nome de modelo. Copie `.env.example` para um arquivo local `.env`, configure o provider e preencha a chave e o modelo correspondentes. Se desejar fallback, configure também o provider alternativo; caso contrário, deixe `AI_FALLBACK_PROVIDER=` vazio. **Nunca envie o arquivo `.env` preenchido ao grupo nem o inclua em ZIP ou Git.** A análise demonstrativa em `/ai/analyze-conflict` funciona sem essas credenciais. Sem `.env`, o SDK do Gemini pode emitir avisos na inicialização, sem impedir a execução do endpoint demonstrativo.

**Limite do MVP:** as Tools retornam evidências simuladas e o `PROPOSE`/`DEFER` é decidido por regras JavaScript. Esta entrega não exige conexão Oracle real e não efetua migração de dados. A integração com o backend, os bancos reais e a análise generativa de conflitos é uma próxima etapa.

### Testes realizados

Foram verificados no PowerShell:

- Respostas `PROPOSE` e `DEFER` nos cenários de demonstração.
- Execução das Tools e registro dos nomes no terminal do servidor.
- HTTP `400` para campos ausentes ou tipos inválidos.
- HTTP `500` para um erro interno simulado; a instrução de teste foi removida posteriormente.
- Retorno ao funcionamento normal após os testes de erro.

A API **não executa alterações no Oracle** e não deve tratar dados simulados como medições reais. O resultado `PROPOSE` é uma **recomendação sujeita a homologação**, não uma autorização para migrar.

## 10. Próximos passos

Para evoluir a versão demonstrativa para uma integração real:

1. Conectar as Tools a dados e serviços controlados do backend e, quando aplicável, ao ambiente Oracle.
2. Integrar a análise especializada com Gemini/OpenAI, mantendo validações determinísticas e respostas estruturadas.
3. Ampliar os testes de cenários, falhas e segurança, incluindo casos fora dos dois exemplos atuais.
4. Alinhar o contrato JSON com o backend do grupo e atualizar as evidências/documentação da entrega.

**Situação atual:** MVP **demonstrativo** funcional com regras JavaScript e dados simulados. A integração com bancos reais e a análise especializada por modelos de IA permanecem pendentes.

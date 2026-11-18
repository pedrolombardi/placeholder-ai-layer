# Relatório de validação — AI Layer

Data: **17/11/2026**. Responsável pela contribuição: **Erick Gruber — RM 99584**.
Baseline e revisões: [BASELINE.md](BASELINE.md).

## Resultados executados

| Verificação | Resultado | Evidência |
|---|---|---|
| Comparação ZIP × AI Layer no GitHub | 20/20 arquivos equivalentes após normalização de CRLF/LF | `evidencias/baseline-comparison.json` |
| Contratos Core/DB e E2E da plataforma | 5 arquivos consultados equivalentes aos do ZIP | `evidencias/contract-sources.json` |
| Instalação limpa: `npm ci --ignore-scripts --no-audit --no-fund` | Sucesso, 109 pacotes instalados | `evidencias/clean-install.txt` |
| `npm run check` | Sucesso | `evidencias/syntax-check.txt` |
| Suíte Node 24.17.0, com cobertura | **106 aprovados, 0 falhas, 0 ignorados** | `evidencias/tests-node24-coverage.txt` |
| Suíte Node 22.23.5 | **106 aprovados, 0 falhas, 0 ignorados** | `evidencias/tests-node22.tap` |
| `npm audit --json`, antes | 2 vulnerabilidades: 1 alta e 1 moderada | `evidencias/audit-before.json` |
| `npm audit --json`, após | 0 vulnerabilidades conhecidas no relatório | `evidencias/audit-after.json` |

Os 106 são os mesmos casos executados em duas versões de Node, não 212 casos distintos.
O runtime Node 22 foi obtido da distribuição oficial e teve SHA-256 conferido antes do uso.
Ambiente: Windows x64, npm 11.13.0.

A primeira tentativa no terminal restrito teve 53 aprovações e 52 falhas porque
conexões locais eram bloqueadas (`connect EACCES 127.0.0.1`). A mesma suíte passou
no executor JavaScript local com suporte a HTTP. Essas falhas de ambiente não foram
ocultadas nem contadas como aprovação. Não foram necessárias mudanças de segurança do sistema.

## O que foi testado

- Regra de e-mail com snapshots do DB entregue e proposta `VARCHAR2(300 CHAR)`.
- Coluna `ativo` com valores 0, 1 e 2; conflitos desconhecidos; dados mascarados;
  ausência, inconsistência e simulação de evidências.
- Diferença BYTE/CHAR, caso multibyte, excesso de tamanho e limites conservadores.
- HTTP real entre cliente de teste, Express da AI Layer e servidor local que
  reproduz respostas do DB. Verificação dos nomes, rotas, métodos e corpos.
- Formato de sucesso consumido pelo Core, sem executar o Core.
- HTTP 400, 404, 413, 500, 502, 503 e 504; JSON inválido; falha de rede;
  redirecionamento recusado; timeout de cabeçalhos e de corpo.
- Validação de entrada, allowlist de tools e ausência de mensagens brutas de erro
  nos retornos públicos.
- Providers com clientes/dublês injetados: texto, fallback, saída vazia,
  múltiplas tools, chamadas repetidas, limites e configuração.
- Processo separado com `src/server.js`, carregamento do `.env` e execução do
  smoke contra um DB HTTP de teste, sem chaves de LLM.

## Cobertura medida

No relatório do Node 24, o conjunto de arquivos instrumentados apresenta
**98,14% de linhas, 94,84% de branches e 100% de funções**. Os módulos de análise
de conflitos, cliente do DB e rotas têm 100% de linhas nesse relatório.

Esses números se referem exclusivamente aos arquivos listados pelo coletor do Node,
incluindo o smoke. Não são uma medição completa de todo o projeto: por exemplo,
`server.js` executado em processo filho e o script de verificação sintática não
aparecem como arquivos cobertos. Cobertura não comprova correção nem qualidade
das respostas de um modelo real.

## Limites e verificações não executadas

| Item | Situação |
|---|---|
| MySQL/Oracle reais | Não consultados nesta validação |
| Backend Core em execução | Não executado; contrato analisado estaticamente e reproduzido nos testes da AI |
| Migração coletiva ponta a ponta | Não executada; continua necessária no ambiente do grupo |
| Chamadas Gemini/OpenAI reais | Não executadas; não foram usadas chaves reais nem gerados custos |
| Docker build/run | Não executados: daemon indisponível (`docker_engine` ausente) |
| CI do GitHub/Linux | Arquivo preparado, ainda não publicado/executado |
| Carga, concorrência elevada, resiliência em produção | Não avaliadas |
| Oracle aceita efetivamente a alteração proposta | Depende do sandbox e da homologação do grupo |
| Adequação integral ao enunciado da Fase 7 | Não certificada: enunciado completo não estava no material consultado |

Os fixtures mantêm `simulated:false` para representar fielmente o contrato
histórico. Isso não transforma sua reprodução em teste com banco real.
A AI Layer continua propondo alterações para validação humana; nenhuma migração
ou aprovação foi realizada nesta tarefa.

## Reprodução

```bash
npm ci
npm run check
npm test
npm run test:coverage
npm audit --omit=dev --audit-level=moderate
```

Com o DB real configurado e a AI Layer iniciada, o grupo pode executar
`npm run smoke`. Registrar o ambiente e a saída dessa execução separadamente.
O workflow `.github/workflows/ci.yml` prepara a repetição em Node 22/24 no Linux
e o build do Dockerfile.

Não usar o histórico de validação da Fase 6 como resultado novo da Fase 7.

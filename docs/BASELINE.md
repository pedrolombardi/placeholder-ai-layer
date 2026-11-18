# Baseline e alterações — 17/11/2026

## Referência principal

ZIPs examinados: `entrega-poc-placeholder(1).zip` e `entrega-poc-placeholder.zip`.
As duas cópias são idênticas em bytes (SHA-256):

`1d9b47394b407fb011bba05b2f71ed3f4eb72058bb19ccf15a91f59001c952e9`.

O ZIP identifica a entrega como Fase 6. Os **20 arquivos** em
`codigo/placeholder-ai-layer/` coincidem com o repositório na revisão abaixo,
após normalização exclusiva de CRLF/LF. O arquivo
[evidencias/baseline-comparison.json](evidencias/baseline-comparison.json) guarda
o resultado por arquivo e seu hash original no ZIP.

| Fonte consultada | Revisão |
|---|---|
| [AI Layer](https://github.com/pedrolombardi/placeholder-ai-layer/tree/624e75c89eca4bfbd0603d35a3224d480e745227) | `624e75c89eca4bfbd0603d35a3224d480e745227` |
| [Backend Core](https://github.com/pedrolombardi/placeholder-backend-core/tree/fbb043ee45c6ac2246310f5428a2b60fd5f9a64b) | `fbb043ee45c6ac2246310f5428a2b60fd5f9a64b` |
| [DB Layer](https://github.com/pedrolombardi/placeholder-db-layer/tree/5ffd41337e1a92c8a5358aa1e480ad2573b2c47e) | `5ffd41337e1a92c8a5358aa1e480ad2573b2c47e` |
| [Plataforma](https://github.com/pedrolombardi/placeholder-platform/tree/529c7b427b38900c14ff2bbf559f8b41b4328407) | `529c7b427b38900c14ff2bbf559f8b41b4328407` |

Somente a AI Layer foi clonada para desenvolvimento. Nos outros repositórios,
houve leitura dos arquivos de contrato `clients.ts`, `schemas.ts`,
`tools.ts`, `routes/tools.ts` e do teste `scripts/e2e.mjs`.
Esses cinco arquivos coincidem com os respectivos arquivos do ZIP, após normalização
de quebras de linha. Não houve alteração nem push nesses repositórios.

A branch de trabalho local é `fase7/ai-layer-mvp`. Não houve push, PR ou
alteração remota da branch principal.

## Problemas comprovados e resposta

| Constatação | Correção |
|---|---|
| `DB_LAYER_URL` capturada no import podia ignorar configuração posterior do `.env` | Configuração lida no momento da chamada; teste com processo real e `.env` |
| `executeTool("constructor")` era aceito por herança do objeto JavaScript | Allowlist com `Object.hasOwn` |
| Excesso de bytes com até 200 caracteres não acionava a regra de tamanho | Respeito a `thresholdUnit` e `maxObservedBytes`; explicação com unidade correta |
| Resposta JSON `null` do DB gerava TypeError | Validação de formato, procedência e campos; erro controlado 502 |
| Cliente do DB não tinha timeout | AbortSignal cobre resposta e leitura do corpo; erro 504 |
| Mensagens do chat aceitavam objetos, números e espaços | Validação de texto e limite de tamanho |
| Erros integrais de SDK/DB eram registrados | Mensagens públicas fixas; sem logs de payloads ou mensagens brutas |
| Tools de demonstração anunciavam status de banco e clientes fictícios | Removidas do catálogo e executor; arquivo `systemTools.js` removido |
| Gemini processava somente a primeira tool e assumia `steps` sempre presente | Todas as chamadas da rodada, até três rodadas/oito tools, sem resultado vazio |
| Configuração do provider principal impedia fallback antes da tentativa | Validação por provider, cliente criado sob demanda |
| npm audit: uma vulnerabilidade alta e uma moderada | `body-parser 2.3.0 → 2.4.0`; `qs 6.16.0 → 6.17.1` no lockfile |

A reprodução anterior às alterações está em
[evidencias/baseline-probes.txt](evidencias/baseline-probes.txt).
As atualizações transitivas não mudam as quatro dependências diretas.
Confira os valores do lockfile e da auditoria anexada.

## Decisões de escopo

A regra permanece restrita ao conflito demonstrado `clientes.email`; o caso `ativo`
continua conservador. O Core entregue não encaminha `rules` à AI Layer.
Generalizar por esse campo exigiria mudança coordenada fora deste escopo.

Não foi acrescentado LLM ao endpoint de conflitos: isso introduziria credenciais,
custo, latência e incerteza no caminho principal já integrado, sem ser necessário
para preservar o MVP. O chat opcional existente foi corrigido e testado com dublês.

Evidência marcada como simulada não produz `PROPOSE`. Falhas de transporte não
são convertidas em decisões aparentemente válidas. Não foram desenvolvidos
autenticação coletiva, UI, conectores de banco, anonimização, sandbox ou execução
de migração: essas atribuições continuam nos serviços responsáveis.

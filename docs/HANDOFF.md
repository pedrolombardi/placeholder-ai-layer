# Handoff para o grupo — contribuição da AI Layer

## O que entregar

O ZIP contém uma cópia completa da **AI Layer**, testes, CI, documentação e
evidências desta validação. Não contém código dos demais microserviços, `.env`,
credenciais, `node_modules` ou histórico `.git`.

A base é o commit `624e75c89eca4bfbd0603d35a3224d480e745227`.
O patch incluído permite revisar/aplicar exatamente as alterações em uma branch
separada. Nenhuma alteração foi publicada no GitHub.

## Aplicação recomendada pelo grupo

1. Trabalhar no clone de **placeholder-ai-layer**, em uma branch nova.
2. Conferir a revisão de origem e ter uma árvore de trabalho limpa.
3. Aplicar primeiro `git apply --check CAMINHO/AI-LAYER-FASE7.patch`.
4. Se a conferência passar, executar `git apply CAMINHO/AI-LAYER-FASE7.patch`.
   Se houver conflito com trabalho recente do grupo, revisar as diferenças;
   não forçar sobreposição nem reset da branch.
5. Rodar `npm ci`, `npm run check` e `npm test`.
6. Integrar/reconstruir somente a imagem da AI Layer usando a orquestração já
   mantida pelo grupo.
7. Rodar `npm run smoke` contra o DB real do banco de demonstração e depois o E2E
   coletivo existente. Guardar esses resultados como uma nova evidência.
8. Revisar o PR antes de incorporar à branch principal.

Alternativa: usar diretamente a pasta completa extraída em um diretório novo.
Evite copiar só `src/`: o lockfile também foi atualizado. Se optar por copiar
sobre um clone anterior, o arquivo removido `src/tools/systemTools.js` deve sair
da revisão; o patch já registra essa remoção.

## Demonstração curta

- Mostrar `npm test`: cenários principais, entradas inválidas, falhas do DB e
  providers controlados.
- Mostrar `GET /health`, explicando que mede somente disponibilidade do processo.
- Com DB real: usar o smoke para `clientes.email` → `PROPOSE` e
  `clientes.ativo` → `DEFER`.
- Explicar que `PROPOSE` é recomendação condicionada à validação Oracle e
  aprovação humana; não comprova alteração executada.
- Mostrar a distinção entre bytes e caracteres e o teste multibyte.

## Texto curto para encaminhar ao grupo

“Finalizei a contribuição da AI Layer a partir da mesma versão entregue na Fase 6.
Preservei o contrato com Core/DB, corrigi configuração, timeout, validação de
evidências e bytes/caracteres, removi tools fictícias e acrescentei 106 testes,
CI e documentação. Os testes passaram no Node 22 e 24. O ZIP inclui o patch
para uma branch separada. Falta validar esta versão no ambiente integrado do
grupo: não foi executado aqui o E2E com bancos reais nem o build Docker.”

## Limites acadêmicos e operacionais

Esta é a contribuição individual da AI Layer, não a entrega consolidada do TCC.
O enunciado integral da Fase 7 não estava entre os documentos consultados.
Requisitos de relatório coletivo, vídeo, usabilidade, deploy, dados reais e
apresentação devem ser conferidos pelo grupo no enunciado.

Não foram utilizados resultados antigos como se fossem testes novos. Fixtures
históricas são identificadas em `test/fixtures/README.md`. O relatório diferencia
testes executados, testes com dublês e verificações não realizadas.

# Evidências usadas nos testes

As três respostas JSON foram copiadas de `codigo/placeholder-db-layer/docs/evidencias/`
do ZIP da Fase 6 (04-profile-email, 05-sample-ativo e 06-check-charset).
São snapshots históricos. A suíte os reproduz em memória/HTTP local; não consulta bancos reais.
O campo `simulated: false` é preservado para verificar o contrato histórico, e não
significa que estes testes se conectaram ao MySQL ou Oracle.
Os demais cenários são variações sintéticas explicitamente construídas pelos testes.

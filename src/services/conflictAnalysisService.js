import { executeTool } from "../tools/toolExecutor.js";

export async function analyzeConflict(conflict) {
    const { conflictId, table, column, source, target } = conflict;

    const evidence = {};
    const toolsUsed = [];

    const args = {
        database: source.database,
        table,
        column
    };

    if (column === "email") {
        evidence.profileColumn = await executeTool(
            "profileColumn",
            args
        );
        toolsUsed.push("profileColumn");

        evidence.checkCharset = await executeTool(
            "checkCharset",
            args
        );
        toolsUsed.push("checkCharset");
    }

    if (column === "ativo") {
        evidence.sampleValues = await executeTool(
            "sampleValues",
            args
        );
        toolsUsed.push("sampleValues");
    }

    const hasEvidence = Object.values(evidence).some(
        result => result.status === "OK"
    );

    let reason = hasEvidence
    ? "Evidências coletadas. A análise de decisão ainda não foi implementada."
    : "Não existem evidências disponíveis para este conflito.";

if (
    column === "ativo" &&
    evidence.sampleValues?.status === "OK" &&
    Array.isArray(evidence.sampleValues.values) &&
    evidence.sampleValues.values.some(
        value => value !== 0 && value !== 1
    )
) {
    reason = "A coluna possui valores além de 0 e 1. Sem conhecer as regras de negócio, não é seguro interpretá-la como booleana. É necessária validação humana.";
}

let verdict = "DEFER";
let proposal = null;

const profile = evidence.profileColumn;
const charset = evidence.checkCharset;

if (
    table === "clientes" &&
    column === "email" &&
    source.database === "mysql" &&
    source.type === "VARCHAR(300)" &&
    target?.database === "oracle" &&
    target?.type === "VARCHAR2(200)" &&
    profile?.status === "OK" &&
    charset?.status === "OK" &&
    profile.lengthThreshold === 200 &&
    profile.valuesAboveThreshold > 0 &&
    profile.maxObservedLength > 200 &&
    profile.maxObservedLength <= 300 &&
    charset.charset === "utf8mb4"
) {
    verdict = "PROPOSE";

    proposal = {
        targetType: "VARCHAR2(300 CHAR)",
        requiresValidation: true
    };

    reason = `Foram identificados ${profile.valuesAboveThreshold} registros acima de 200 caracteres. Recomenda-se avaliar VARCHAR2(300 CHAR), sujeito à validação de compatibilidade no Oracle e aprovação humana.`;
}


    return {
        conflictId,
        verdict,
        proposal,
        reason,
        simulated: Object.values(evidence).some(e => e.simulated !== false),
        toolsUsed,
        evidence
    };
}
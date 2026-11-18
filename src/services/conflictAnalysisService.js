import { executeTool } from "../tools/toolExecutor.js";

export async function analyzeConflict(conflict, { runTool = executeTool } = {}) {
    const { conflictId, table, column, source, target } = conflict;
    const evidence = {};
    const toolsUsed = [];
    const args = { database: source.database, table, column };
    async function collect(name) {
        evidence[name] = await runTool(name, args);
        toolsUsed.push(name);
    }
    // Preserve the scope supported by the delivered Core contract.
    if (column === "email") {
        await collect("profileColumn");
        await collect("checkCharset");
    }
    if (column === "ativo") await collect("sampleValues");
    const results = Object.values(evidence);
    const simulated = results.some(e => e.simulated !== false);
    let verdict = "DEFER", proposal = null;
    let reason = results.some(e => e.status === "OK")
        ? "Evidências coletadas, mas não há regra validada para propor uma alteração. É necessária validação humana."
        : "Não existem evidências disponíveis para este conflito.";
    const sample = evidence.sampleValues;
    if (sample?.status === "OK") {
        if (sample.masked) {
            reason = "A amostra foi mascarada pelo DB Layer. Não é possível inferir a regra de negócio; é necessária validação humana.";
        } else if (sample.values.some(v => v !== 0 && v !== 1)) {
            reason = "A coluna possui valores além de 0 e 1. Sem conhecer as regras de negócio, não é seguro interpretá-la como booleana. É necessária validação humana.";
        } else {
            reason = "A amostra não comprova a semântica booleana da coluna. É necessária validação humana.";
        }
    }
    const profile = evidence.profileColumn, charset = evidence.checkCharset;
    const measured = profile?.thresholdUnit === "BYTE" ? profile.maxObservedBytes : profile?.maxObservedLength;
    if (table === "clientes" && column === "email" &&
        source.database === "mysql" && source.type === "VARCHAR(300)" &&
        target.database === "oracle" && target.type === "VARCHAR2(200)" &&
        profile?.status === "OK" && charset?.status === "OK" &&
        !simulated && profile.lengthThreshold === 200 &&
        ["BYTE", "CHAR"].includes(profile.thresholdUnit) &&
        Number.isSafeInteger(profile.valuesAboveThreshold) && profile.valuesAboveThreshold > 0 &&
        profile.valuesAboveThreshold <= profile.totalRows &&
        Number.isSafeInteger(measured) && measured > 200 &&
        Number.isSafeInteger(profile.maxObservedLength) &&
        profile.maxObservedLength > 0 && profile.maxObservedLength <= 300 &&
        charset.charset === "utf8mb4") {
        verdict = "PROPOSE";
        proposal = { targetType: "VARCHAR2(300 CHAR)", requiresValidation: true };
        const unit = profile.thresholdUnit === "BYTE" ? "bytes" : "caracteres";
        reason = `Foram identificados ${profile.valuesAboveThreshold} registros acima de 200 ${unit}. Recomenda-se avaliar VARCHAR2(300 CHAR), sujeito à validação de compatibilidade no Oracle e aprovação humana.`;
    }
    if (simulated) reason = "As evidências são simuladas ou não têm procedência confirmada. É necessária validação humana com dados reais.";
    return { conflictId, verdict, proposal, reason, simulated, toolsUsed, evidence };
}

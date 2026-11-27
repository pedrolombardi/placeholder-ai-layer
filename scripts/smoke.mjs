// Read-only smoke check against a running AI Layer and its configured DB Layer.
// No migration, approval or write operation is performed.
import assert from "node:assert/strict";
const base = (process.env.AI_LAYER_URL || "http://localhost:3001").replace(/\/$/, "");
async function call(path, body) {
    const response = await fetch(base + path, {
        method: body ? "POST" : "GET",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    return data;
}
const health = await call("/health");
assert.equal(health.status, "ok");
const common = { table:"clientes",source:{database:"mysql",type:"VARCHAR(300)"},target:{database:"oracle",type:"VARCHAR2(200)"} };
const email = await call("/ai/analyze-conflict",{...common,conflictId:"clientes.email",column:"email"});
assert.equal(email.verdict,"PROPOSE");
assert.equal(email.proposal.targetType,"VARCHAR2(300 CHAR)");
assert.equal(email.proposal.requiresValidation,true);
assert.equal(email.simulated,false);
const active = await call("/ai/analyze-conflict",{
    ...common,conflictId:"clientes.ativo",column:"ativo",
    source:{database:"mysql",type:"TINYINT(1)"},target:{database:"oracle",type:"NUMBER(1)"}
});
assert.equal(active.verdict,"DEFER");
assert.equal(active.simulated,false);
console.log("SMOKE OK: health, clientes.email PROPOSE e clientes.ativo DEFER.");
console.log("Este resultado verifica os endpoints configurados; não comprova execução de migração.");

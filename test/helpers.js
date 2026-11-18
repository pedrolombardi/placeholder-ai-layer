import { readFile } from "node:fs/promises";
import { once } from "node:events";
import assert from "node:assert/strict";
export const email = {
    conflictId: "clientes.email", table: "clientes", column: "email",
    source: { database: "mysql", type: "VARCHAR(300)" },
    target: { database: "oracle", type: "VARCHAR2(200)" }
};
export const active = {
    ...email, conflictId: "clientes.ativo", column: "ativo",
    source: { database: "mysql", type: "TINYINT(1)" },
    target: { database: "oracle", type: "NUMBER(1)" }
};
export async function fixture(name) {
    return JSON.parse(await readFile(new URL("./fixtures/" + name + ".json", import.meta.url), "utf8"));
}
export async function listen(server) {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    return "http://127.0.0.1:" + server.address().port;
}
export async function close(server) {
    const finished = new Promise(resolve => server.close(resolve));
    server.closeAllConnections?.();
    await finished;
}
// Mirrors the analyzeConflictResponse fields consumed by the delivered Core.
// This checks the wire contract; it does not run the Core or its orchestration.
export function assertCoreContract(body) {
    assert.equal(typeof body.conflictId, "string");
    assert.ok(["PROPOSE", "DEFER"].includes(body.verdict));
    assert.equal(typeof body.reason, "string");
    assert.equal(typeof body.simulated, "boolean");
    assert.ok(body.evidence && typeof body.evidence === "object" && !Array.isArray(body.evidence));
    assert.ok(Array.isArray(body.toolsUsed));
    if (body.verdict === "PROPOSE") {
        assert.equal(typeof body.proposal.targetType, "string");
        assert.equal(body.proposal.requiresValidation, true);
    } else assert.equal(body.proposal, null);
}

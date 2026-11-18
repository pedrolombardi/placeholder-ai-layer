import { ServiceError } from "../errors.js";
const invalidResponse = () => new ServiceError("DB_INVALID_RESPONSE", 502, "Resposta inválida do DB Layer");
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const nullableCount = value => value === null || count(value);

function validateEvidence(tool, body, args) {
    if (!object(body) || !["OK", "NO_DATA"].includes(body.status) ||
        typeof body.simulated !== "boolean" ||
        body.database !== args.database ||
        typeof body.table !== "string" || body.table.toLowerCase() !== args.table.toLowerCase() ||
        typeof body.column !== "string" || body.column.toLowerCase() !== args.column.toLowerCase()) {
        throw invalidResponse();
    }
    if (body.status === "NO_DATA") {
        if (typeof body.reason !== "string") throw invalidResponse();
        return body;
    }
    if (tool === "profile-column") {
        if (!count(body.totalRows) || !nullableCount(body.lengthThreshold) ||
            !nullableCount(body.valuesAboveThreshold) || !nullableCount(body.maxObservedLength) ||
            !nullableCount(body.maxObservedBytes) ||
            ![null, "BYTE", "CHAR"].includes(body.thresholdUnit) ||
            (body.valuesAboveThreshold !== null && body.valuesAboveThreshold > body.totalRows)) {
            throw invalidResponse();
        }
    }
    if (tool === "sample-values") {
        if (!Array.isArray(body.values) || typeof body.masked !== "boolean" ||
            typeof body.truncated !== "boolean" ||
            body.values.some(v => v !== null && !["string", "number", "boolean"].includes(typeof v)) ||
            (body.masked && body.values.length > 0)) throw invalidResponse();
    }
    if (tool === "check-charset" &&
        (body.charset !== null && typeof body.charset !== "string")) throw invalidResponse();
    return body;
}

export async function callDbLayer(tool, args) {
    // Read on each call: server.js loads dotenv after imports have been evaluated.
    const base = process.env.DB_LAYER_URL || "http://localhost:3002";
    const timeout = Number(process.env.DB_LAYER_TIMEOUT_MS || 1000);
    let url;
    try {
        url = new URL(base);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
            url.search || url.hash || !Number.isInteger(timeout) || timeout < 1 || timeout > 60000) {
            throw new Error();
        }
        url = new URL(`${base.replace(/\/$/, "")}/tools/${tool}`);
    } catch {
        throw new ServiceError("DB_CONFIG", 503, "Configuração do DB Layer inválida");
    }
    const signal = AbortSignal.timeout(timeout);
    let res, body;
    try {
        res = await fetch(url, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(args), signal, redirect: "error"
        });
        // Preserve 400 -> INVALID without echoing upstream error bodies.
        if (res.status === 400) {
            await res.body?.cancel();
            return { status: "INVALID", simulated: false, reason: "Parâmetros recusados pelo DB Layer" };
        }
        if (!res.ok) {
            await res.body?.cancel();
            throw new ServiceError("DB_UNAVAILABLE", 502, "DB Layer indisponível");
        }
        body = await res.json();
    } catch (error) {
        if (signal.aborted) throw new ServiceError("DB_TIMEOUT", 504, "Tempo limite ao consultar o DB Layer");
        if (error instanceof ServiceError) throw error;
        if (error instanceof SyntaxError) throw invalidResponse();
        throw new ServiceError("DB_UNAVAILABLE", 502, "DB Layer indisponível");
    }
    return validateEvidence(tool, body, args);
}
export function profileColumn({ database, table, column }) {
    return callDbLayer("profile-column", { database, table, column });
}
export function sampleValues({ database, table, column }) {
    return callDbLayer("sample-values", { database, table, column });
}
export function checkCharset({ database, table, column }) {
    return callDbLayer("check-charset", { database, table, column });
}

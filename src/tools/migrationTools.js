// Tools de evidencia: agora chamam o DB Layer (dado real, simulated: false).
// O DB Layer valida tabela/coluna contra o catalogo; nenhum SQL sai daqui.
const DB_LAYER_URL = process.env.DB_LAYER_URL || "http://localhost:3002";

async function callDbLayer(tool, args) {
    const res = await fetch(`${DB_LAYER_URL}/tools/${tool}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args)
    });
    const body = await res.json().catch(() => ({}));

    // 400 = parametro/identificador invalido: vira resultado da tool, nao erro 500
    if (res.status === 400) {
        return { status: "INVALID", simulated: false, reason: body.error || "parametros invalidos" };
    }
    if (!res.ok) {
        throw new Error(`DB Layer ${tool}: HTTP ${res.status} ${body.error || ""}`);
    }
    return body;
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

export function profileColumn({ database, table, column }) {
    if (
        database !== "mysql" ||
        table !== "clientes" ||
        column !== "email"
    ) {
        return {
            status: "NO_DATA",
            reason: "Não existem dados simulados para esta coluna."
        };
    }

    return {
        status: "OK",
        simulated: true,
        database,
        table,
        column,
        totalRows: 6812,
        lengthThreshold: 200,
        valuesAboveThreshold: 340,
        maxObservedLength: 268
    };
}

export function sampleValues({ database, table, column }) {
    if (
        database !== "mysql" ||
        table !== "clientes" ||
        column !== "ativo"
    ) {
        return {
            status: "NO_DATA",
            simulated: true,
            reason: "Não existem amostras simuladas para esta coluna."
        };
    }

    return {
        status: "OK",
        simulated: true,
        database,
        table,
        column,
        values: [0, 1, 2]
    };
}

export function checkCharset({ database, table, column }) {
    if (
        database !== "mysql" ||
        table !== "clientes" ||
        column !== "email"
    ) {
        return {
            status: "NO_DATA",
            simulated: true,
            reason: "Não existem dados simulados de charset para esta coluna."
        };
    }

    return {
        status: "OK",
        simulated: true,
        database,
        table,
        column,
        charset: "utf8mb4",
        collation: "utf8mb4_0900_ai_ci",
        maxBytesPerCharacter: 4
    };
}
export const systemStatusTool = {
    type: "function",
    name: "getSystemStatus",
    description: "Retorna o status atual dos serviços da aplicação.",
    parameters: {
        type: "object",
        properties: {}
    }
};

export const customerDataTool = {
    type: "function",
    name: "getCustomerData",
    description: "Retorna os dados de um cliente a partir do seu ID.",
    parameters : {
        type: "object",
        properties: {
            customerId: {
                type: "number",
                description:"ID numérico do cliente"
            }
        },
        required: ["customerId"]
    }
};

export const profileColumnTool = {
    type: "function",
    name: "profileColumn",
    description: "Retorna informações estatísticas sobre uma coluna de um banco de dados.",
    parameters: {
        type: "object",
        properties: {
            database: {
                type: "string",
                description: "Banco de dados da coluna, como mysql ou oracle."
            },
            table: {
                type: "string",
                description: "Nome da tabela que será analisada."
            },
            column: {
                type: "string",
                description: "Nome da coluna que será analisada."
            }
        },
        required: ["database", "table", "column"]
    }
};

export const sampleValuesTool = {
    type: "function",
    name: "sampleValues",
    description: "Retorna os valores distintos de uma coluna (dado real, via DB Layer; colunas com muitos valores distintos voltam mascaradas por LGPD).",
    parameters: {
        type: "object",
        properties: {
            database: {
                type: "string",
                description: "Banco de dados, como mysql ou oracle."
            },
            table: {
                type: "string",
                description: "Nome da tabela."
            },
            column: {
                type: "string",
                description: "Nome da coluna."
            }
        },
        required: ["database", "table", "column"]
    }
};

export const checkCharsetTool = {
    type: "function",
    name: "checkCharset",
    description: "Retorna o charset, a collation e os bytes por caractere de uma coluna (dado real, via DB Layer).",
    parameters: {
        type: "object",
        properties: {
            database: {
                type: "string",
                description: "Banco de dados, como mysql ou oracle."
            },
            table: {
                type: "string",
                description: "Nome da tabela."
            },
            column: {
                type: "string",
                description: "Nome da coluna."
            }
        },
        required: ["database", "table", "column"]
    }
};

export const toolDefinitions = [
    systemStatusTool,
    customerDataTool,
    profileColumnTool,
    sampleValuesTool,
    checkCharsetTool
];
const parameters = {
    type: "object",
    properties: {
        database: { type: "string", description: "Banco de dados: mysql ou oracle." },
        table: { type: "string", description: "Nome da tabela." },
        column: { type: "string", description: "Nome da coluna." }
    },
    required: ["database", "table", "column"]
};
export const profileColumnTool = {
    type: "function", name: "profileColumn",
    description: "Obtém estatísticas de comprimento via DB Layer. Consulte thresholdUnit para distinguir BYTE de CHAR.",
    parameters
};
export const sampleValuesTool = {
    type: "function", name: "sampleValues",
    description: "Obtém valores categóricos via DB Layer; dados de alta cardinalidade são mascarados.",
    parameters
};
export const checkCharsetTool = {
    type: "function", name: "checkCharset",
    description: "Obtém charset e collation via DB Layer.",
    parameters
};
export const toolDefinitions = [profileColumnTool, sampleValuesTool, checkCharsetTool];
